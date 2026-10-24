import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { statusSchema, updateSchema } from "@/lib/schemas";
import { sendStatusUpdateNotification } from "@/lib/notifications";

export const runtime = "nodejs";

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

  // 1. Fetch existing record to capture previous status and verify existence
  const { data: existing, error: fetchError } = await auth.client
    .from("enquiries")
    .select("id, reference, full_name, email, status, internal_notes, assigned_to")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (fetchError) {
    console.error("Admin enquiry inspection failed", { code: fetchError.code });
    return NextResponse.json({ error: "Unable to inspect enquiry before update." }, { status: 502 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Enquiry not found." }, { status: 404 });
  }

  // 2. Prepare update payload
  const update: Record<string, unknown> = {
    status: parsed.data.status
  };

  if (parsed.data.internalNotes !== undefined) {
    update.internal_notes = parsed.data.internalNotes.trim();
  }

  if (parsed.data.assignedTo !== undefined) {
    update.assigned_to = parsed.data.assignedTo;
  }

  // 3. Execute update
  const { data: updated, error: updateError } = await auth.client
    .from("enquiries")
    .update(update)
    .eq("id", parsed.data.id)
    .select("id, reference, full_name, email, status, internal_notes, assigned_to, updated_at")
    .maybeSingle();

  if (updateError || !updated) {
    console.error("Admin enquiry update failed", { code: updateError?.code });
    return NextResponse.json({ error: "Unable to update this enquiry right now." }, { status: 502 });
  }

  // 4. Record audit event with accurate state transitions (old_status & new_status)
  const statusChanged = existing.status !== updated.status;
  const notesChanged = existing.internal_notes !== updated.internal_notes;
  const assignmentChanged = existing.assigned_to !== updated.assigned_to;

  const eventType = statusChanged
    ? "admin_status_change"
    : notesChanged
    ? "admin_note_update"
    : assignmentChanged
    ? "admin_assignment_update"
    : "admin_update";

  const { error: auditError } = await auth.client.from("enquiry_audit_events").insert({
    enquiry_id: updated.id,
    actor_user_id: auth.userId,
    event_type: eventType,
    old_status: existing.status,
    new_status: updated.status,
    note: parsed.data.internalNotes?.trim() || null
  });

  if (auditError) {
    console.error("CRITICAL: Admin audit event write failed", {
      code: auditError.code,
      enquiryId: updated.id,
      actorUserId: auth.userId,
      oldStatus: existing.status,
      newStatus: updated.status
    });
  }

  // 5. Asynchronous customer notification (PRIVACY PRESERVED: internal notes are NEVER included)
  if (statusChanged || parsed.data.customerMessage) {
    void sendStatusUpdateNotification({
      reference: updated.reference,
      fullName: updated.full_name,
      email: updated.email,
      oldStatus: existing.status,
      newStatus: updated.status,
      customerMessage: parsed.data.customerMessage?.trim() || null
    });
  }

  return NextResponse.json({
    enquiry: updated,
    auditLogged: !auditError,
    previousStatus: existing.status
  });
}
