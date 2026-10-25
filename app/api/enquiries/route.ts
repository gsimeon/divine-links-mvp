import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { enquirySchema } from "@/lib/schemas";
import { getClientIp, checkRateLimit } from "@/lib/rate-limiter";
import { sendCustomerEnquiryConfirmation, sendAdminEnquiryAlert } from "@/lib/notifications";

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

  if (!rpcError && rpcEnquiryId) {
    enquiryId = rpcEnquiryId as string;
  } else {
    // 2. Fallback to direct insertion if migration RPC is not yet registered
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
      console.error("Enquiry persistence failed", { code: insertError.code });
      return NextResponse.json({ error: "We couldn’t save your enquiry just now. Please try again later." }, { status: 502 });
    }
    enquiryId = inserted?.id;
  }

  // Reliable notification dispatch: awaited before response to guarantee execution in serverless runtimes
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
