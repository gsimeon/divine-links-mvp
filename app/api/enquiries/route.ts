import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { enquirySchema } from "@/lib/schemas";
import { getClientIp, checkRateLimit } from "@/lib/rate-limiter";
import { sendCustomerEnquiryConfirmation, sendAdminEnquiryAlert } from "@/lib/notifications";
import { processOutboxQueue } from "@/lib/outbox-worker";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateResult = await checkRateLimit(ip, "enquiry");
  if (!rateResult.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes and try again." },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((rateResult.resetTime - Date.now()) / 1000).toString(),
          "X-RateLimit-Limit": rateResult.limit.toString(),
          "X-RateLimit-Remaining": "0"
        }
      }
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Please submit a valid form." }, { status: 400 });
  }

  const parsed = enquirySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the required fields and try again." }, { status: 400 });
  }

  // Honeypot: quietly accept bot submissions without persisting them.
  if (parsed.data.website?.trim()) {
    return NextResponse.json({ ok: true, reference: `DL-${randomUUID().slice(0, 8).toUpperCase()}` });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({
      error: "The enquiry service is not configured yet. Your details have not been saved. Please contact the business through its confirmed contact channel."
    }, { status: 503 });
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const reference = `DL-${randomUUID().slice(0, 8).toUpperCase()}`;

  let enquiryId: string | undefined;

  // 1. Attempt Atomic Transactional Outbox RPC
  const { data: rpcEnquiryId, error: rpcError } = await supabase.rpc("submit_enquiry_atomic", {
    p_reference: reference,
    p_full_name: parsed.data.fullName,
    p_email: parsed.data.email.toLowerCase(),
    p_phone: parsed.data.phone,
    p_location: parsed.data.location,
    p_service: parsed.data.service,
    p_audience: parsed.data.audience,
    p_details: parsed.data.details,
    p_confirmation_subject: `Enquiry Received: ${reference} - Divine Links`,
    p_confirmation_body: `Hello ${parsed.data.fullName},\n\nThank you for contacting Divine Links. Your reference is ${reference}. Track status at https://divinelinks.co/track.`,
    p_admin_subject: `[New Enquiry] ${reference} - ${parsed.data.fullName} (${parsed.data.service.toUpperCase()})`,
    p_admin_body: `New Enquiry Logged:\nReference: ${reference}\nClient: ${parsed.data.fullName}\nEmail: ${parsed.data.email}\nPhone: ${parsed.data.phone}\nLocation: ${parsed.data.location}\nService: ${parsed.data.service}\nDetails: ${parsed.data.details}`
  });

  if (rpcError) {
    const isMissingFunction = rpcError.code === "PGRST202";
    const allowFallback = process.env.ALLOW_SCHEMA_FALLBACK === "true" && isMissingFunction;

    if (!allowFallback) {
      const correlationId = randomUUID();
      console.error("[Enquiry RPC Failure] Database transaction failed closed", {
        correlationId,
        code: rpcError.code,
        message: rpcError.message,
        reference
      });
      return NextResponse.json(
        { error: "We couldn’t save your enquiry just now. Please try again later.", correlationId },
        { status: 502 }
      );
    }

    // 2. Fallback to direct insertion ONLY when explicitly permitted for development compatibility
    console.warn("[Enquiry Fallback] ALLOW_SCHEMA_FALLBACK active for missing RPC", { reference });
    const { data: inserted, error: insertError } = await supabase.from("enquiries").insert({
      reference,
      full_name: parsed.data.fullName,
      email: parsed.data.email.toLowerCase(),
      phone: parsed.data.phone,
      location: parsed.data.location,
      service: parsed.data.service,
      audience: parsed.data.audience,
      details: parsed.data.details,
      consent: true,
      status: "submitted"
    }).select("id").maybeSingle();

    if (insertError) {
      const correlationId = randomUUID();
      console.error("[Enquiry Persistence Error] Fallback insertion failed", {
        correlationId,
        code: insertError.code
      });
      return NextResponse.json(
        { error: "We couldn’t save your enquiry just now. Please try again later.", correlationId },
        { status: 502 }
      );
    }
    enquiryId = inserted?.id;

    // In development fallback mode, dispatch notifications directly since RPC didn't queue them
    await Promise.allSettled([
      sendCustomerEnquiryConfirmation({
        enquiryId,
        reference,
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        service: parsed.data.service,
        location: parsed.data.location,
        details: parsed.data.details
      }),
      sendAdminEnquiryAlert({
        enquiryId,
        reference,
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        service: parsed.data.service,
        location: parsed.data.location,
        details: parsed.data.details
      })
    ]);

    return NextResponse.json({ ok: true, reference }, { status: 201 });
  }

  enquiryId = rpcEnquiryId as string;

  // Single Source of Truth for Notification Delivery:
  // The atomic RPC has ALREADY created durable outbox records. Trigger the outbox worker immediately
  // to deliver messages in serverless context without creating duplicate outbox records.
  await processOutboxQueue({ enquiryId, maxBatch: 2 });

  return NextResponse.json({ ok: true, reference }, { status: 201 });
}
