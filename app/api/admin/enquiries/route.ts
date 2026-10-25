import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { statusSchema, updateSchema } from "@/lib/schemas";
import { sendStatusUpdateNotification } from "@/lib/notifications";
import { getClientIp, checkRateLimit } from "@/lib/rate-limiter";

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
  const ip = getClientIp(request);
  const rateResult = await checkRateLimit(ip, "admin");
  if (!rateResult.allowed) {
    return NextResponse.json({ error: "Too many admin requests. Please slow down." }, { status: 429 });
  }

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
  const ip = getClientIp(request);
  const rateResult = await checkRateLimit(ip, "admin");
  if (!rateResult.allowed) {
    return NextResponse.json({ error: "Too many admin requests. Please slow down." }, { status: 429 });
  }

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

  // Attempt Atomic Update via PostgreSQL Database Function (RPC)
  const { data: rpcData, error: rpcError } = await auth.client.rpc("admin_update_enquiry", {
    p_enquiry_id: parsed.data.id,
    p_actor_user_id: auth.userId,
    p_status: parsed.data.status,
    p_internal_notes: parsed.data.internalNotes?.trim() || null,
    p_assigned_to: parsed.data.assignedTo || null
  });

  if (rpcError) {
    const isMissingFunction = rpcError.code === "PGRST202";
    const allowFallback = process.env.ALLOW_SCHEMA_FALLBACK === "true" && isMissingFunction;

    if (!allowFallback) {
      const correlationId = randomUUID();
      console.error("[Admin Update Error] Database transaction failed closed", {
        correlationId,
        code: rpcError.code,
        message: rpcError.message,
        enquiryId: parsed.data.id
      });
      return NextResponse.json(
        { error: "Database transaction failed. Update was not applied.", correlationId },
        { status: 502 }
      );
    }

    console.warn("[Admin Update Fallback] ALLOW_SCHEMA_FALLBACK active for missing RPC", { enquiryId: parsed.data.id });
  } else if (rpcData) {
    const outcome = rpcData as {
      enquiry: {
        id: string;
        reference: string;
        full_name: string;
        email: string;
        status: string;
        internal_notes: string | null;
        assigned_to: string | null;
        updated_at: string;
      };
      previous_status: string;
      status_changed: boolean;
      audit_id: string;
    };

    if (outcome.status_changed || parsed.data.customerMessage) {
      await sendStatusUpdateNotification({
        enquiryId: outcome.enquiry.id,
        reference: outcome.enquiry.reference,
        fullName: outcome.enquiry.full_name,
        email: outcome.enquiry.email,
        oldStatus: outcome.previous_status,
        newStatus: outcome.enquiry.status,
        customerMessage: parsed.data.customerMessage?.trim() || null
      });
    }

    return NextResponse.json({
      enquiry: outcome.enquiry,
      auditLogged: true,
      atomic: true,
      previousStatus: outcome.previous_status
    });
  }

  // Fallback: Two-phase update with compensation rollback ONLY if explicitly allowed for schema compatibility
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

  const updatePayload: Record<string, unknown> = {
    status: parsed.data.status,
    internal_notes: parsed.data.internalNotes !== undefined ? parsed.data.internalNotes.trim() : existing.internal_notes,
    assigned_to: parsed.data.assignedTo !== undefined ? parsed.data.assignedTo : existing.assigned_to
  };

  const { data: updated, error: updateError } = await auth.client
    .from("enquiries")
    .update(updatePayload)
    .eq("id", parsed.data.id)
    .select("id, reference, full_name, email, status, internal_notes, assigned_to, updated_at")
    .maybeSingle();

  if (updateError || !updated) {
    console.error("Admin enquiry update failed", { code: updateError?.code });
    return NextResponse.json({ error: "Unable to update this enquiry right now." }, { status: 502 });
  }

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

  // CRITICAL AUDIT INTEGRITY: If audit logging fails, roll back enquiry status immediately!
  if (auditError) {
    console.error("CRITICAL: Admin audit write failed, rolling back enquiry state", {
      code: auditError.code,
      enquiryId: updated.id
    });

    await auth.client.from("enquiries").update({
      status: existing.status,
      internal_notes: existing.internal_notes,
      assigned_to: existing.assigned_to
    }).eq("id", parsed.data.id);

    return NextResponse.json({
      error: "Audit trail write failed. To ensure compliance, the status update was rolled back."
    }, { status: 500 });
  }

  if (statusChanged || parsed.data.customerMessage) {
    await sendStatusUpdateNotification({
      enquiryId: updated.id,
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
    auditLogged: true,
    atomic: false,
    previousStatus: existing.status
  });
}
