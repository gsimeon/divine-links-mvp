import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { getClientIp, checkRateLimit } from "@/lib/rate-limiter";

export const runtime = "nodejs";

const gdprActionSchema = z.object({
  id: z.uuid(),
  action: z.enum(["anonymize", "delete"])
});

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

  if (data.user.app_metadata?.role !== "admin") {
    return { error: NextResponse.json({ error: "You do not have permission to access this area." }, { status: 403 }) };
  }
  return { client, userId: data.user.id };
}

export async function POST(request: NextRequest) {
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

  const parsed = gdprActionSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid enquiry ID or GDPR action." }, { status: 400 });
  }

  if (parsed.data.action === "anonymize") {
    const { data, error } = await auth.client.from("enquiries")
      .update({
        full_name: "Anonymized Individual",
        email: `erased-${parsed.data.id.slice(0, 8)}@privacy.internal`,
        phone: "+0000000000",
        location: "Redacted",
        details: "[Personal details permanently anonymized pursuant to UK GDPR Article 17 Right to Erasure]",
        status: "cancelled",
        internal_notes: "PII anonymized per verified data rights request."
      })
      .eq("id", parsed.data.id)
      .select("id, reference, status, updated_at")
      .maybeSingle();

    if (error || !data) {
      console.error("GDPR anonymization failed", error);
      return NextResponse.json({ error: "Unable to process anonymization." }, { status: 500 });
    }

    await auth.client.from("enquiry_audit_events").insert({
      enquiry_id: data.id,
      actor_user_id: auth.userId,
      event_type: "gdpr_erasure_anonymized",
      new_status: "cancelled",
      note: "Customer PII redacted and anonymized under UK GDPR Article 17."
    });

    return NextResponse.json({ ok: true, message: `Enquiry ${data.reference} successfully anonymized under GDPR.` });
  }

  // Action: delete (Hard erasure)
  // First attempt atomic database function RPC
  const { error: rpcDelError } = await auth.client.rpc("admin_delete_enquiry_gdpr", {
    p_enquiry_id: parsed.data.id,
    p_actor_user_id: auth.userId
  });

  if (!rpcDelError) {
    return NextResponse.json({ ok: true, message: "Enquiry record and associated data permanently deleted (atomic)." });
  }

  // Fallback: Sequential deletion in strict foreign key order (outbox -> audit -> enquiry)
  // 1. Delete associated outbox rows
  await auth.client.from("notifications_outbox").delete().eq("enquiry_id", parsed.data.id);

  // 2. Delete associated audit events to satisfy ON DELETE RESTRICT
  const { error: auditDelError } = await auth.client
    .from("enquiry_audit_events")
    .delete()
    .eq("enquiry_id", parsed.data.id);

  if (auditDelError) {
    console.error("GDPR audit events cleanup failed", { code: auditDelError.code, enquiryId: parsed.data.id });
    return NextResponse.json({ error: "Unable to clear associated audit events before deletion." }, { status: 500 });
  }

  // 3. Delete the parent enquiry record
  const { error: delError } = await auth.client
    .from("enquiries")
    .delete()
    .eq("id", parsed.data.id);

  if (delError) {
    console.error("GDPR enquiry deletion failed", { code: delError.code, enquiryId: parsed.data.id });
    return NextResponse.json({ error: "Unable to delete enquiry record." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Enquiry record and associated audit trail permanently deleted." });
}
