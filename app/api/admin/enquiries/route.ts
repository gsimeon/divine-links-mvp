import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export const runtime = "nodejs";

export const statusSchema = z.enum([
  "submitted", "under_review", "awaiting_customer", "awaiting_partner",
  "in_progress", "completed", "cancelled", "unable_to_fulfil"
]);

function clients() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function requireAdmin(request: NextRequest) {
  const client = clients();
  if (!client) return { error: NextResponse.json({ error: "Admin service is not configured." }, { status: 503 }) };
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return { error: NextResponse.json({ error: "Sign in is required." }, { status: 401 }) };

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return { error: NextResponse.json({ error: "Your session is invalid or expired." }, { status: 401 }) };

  // Only a server-assigned app_metadata role is trusted; user-editable user_metadata is not.
  if (data.user.app_metadata?.role !== "admin") {
    return { error: NextResponse.json({ error: "You do not have permission to access this area." }, { status: 403 }) };
  }
  return { client, userId: data.user.id };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const status = request.nextUrl.searchParams.get("status");
  const search = request.nextUrl.searchParams.get("search")?.trim();
  const service = request.nextUrl.searchParams.get("service");

  if (status && status !== "all" && !statusSchema.safeParse(status).success) {
    return NextResponse.json({ error: "Invalid status filter." }, { status: 400 });
  }

  let query = auth.client.from("enquiries")
    .select("id, reference, full_name, email, phone, location, service, audience, details, status, internal_notes, assigned_to, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (service && service !== "all") {
    query = query.eq("service", service);
  }

  if (search) {
    // Sanitize search term to prevent query manipulation
    const cleanSearch = search.replace(/[%_,]/g, "");
    if (cleanSearch) {
      query = query.or(
        `reference.ilike.%${cleanSearch}%,full_name.ilike.%${cleanSearch}%,email.ilike.%${cleanSearch}%,phone.ilike.%${cleanSearch}%,location.ilike.%${cleanSearch}%`
      );
    }
  }

  const { data, error } = await query;
  if (error) {
    console.error("Admin enquiry list failed", { code: error.code });
    return NextResponse.json({ error: "Unable to load enquiries right now." }, { status: 502 });
  }

  return NextResponse.json({ enquiries: data ?? [] });
}

export const updateSchema = z.object({
  id: z.uuid(),
  status: statusSchema,
  internalNotes: z.string().max(4000).optional(),
  assignedTo: z.uuid().nullable().optional()
});

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Please submit valid JSON." }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Please check the update fields." }, { status: 400 });

  const update: Record<string, unknown> = {
    status: parsed.data.status
  };

  if (parsed.data.internalNotes !== undefined) {
    update.internal_notes = parsed.data.internalNotes.trim();
  }

  if (parsed.data.assignedTo !== undefined) {
    update.assigned_to = parsed.data.assignedTo;
  }

  const { data, error } = await auth.client.from("enquiries")
    .update(update)
    .eq("id", parsed.data.id)
    .select("id, reference, status, internal_notes, assigned_to, updated_at")
    .maybeSingle();

  if (error) {
    console.error("Admin enquiry update failed", { code: error.code });
    return NextResponse.json({ error: "Unable to update this enquiry right now." }, { status: 502 });
  }
  if (!data) return NextResponse.json({ error: "Enquiry not found." }, { status: 404 });

  const { error: auditError } = await auth.client.from("enquiry_audit_events").insert({
    enquiry_id: data.id,
    actor_user_id: auth.userId,
    event_type: "admin_update",
    new_status: data.status,
    note: parsed.data.internalNotes?.trim() || null
  });

  if (auditError) {
    console.error("Admin audit event failed", { code: auditError.code, enquiryId: data.id });
  }

  return NextResponse.json({ enquiry: data, auditLogged: !auditError });
}
