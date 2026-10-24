import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { enquirySchema } from "@/lib/schemas";
import { rateLimited } from "@/lib/rate-limiter";
import { sendCustomerEnquiryConfirmation, sendAdminEnquiryAlert } from "@/lib/notifications";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many attempts. Please wait a few minutes and try again." }, { status: 429 });
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
  const { error } = await supabase.from("enquiries").insert({
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
  });

  if (error) {
    // Avoid returning database/provider internals to the browser.
    console.error("Enquiry persistence failed", { code: error.code });
    return NextResponse.json({ error: "We couldn’t save your enquiry just now. Please try again later." }, { status: 502 });
  }

  // Asynchronous notification dispatch (non-blocking for fast response)
  void sendCustomerEnquiryConfirmation({
    reference,
    fullName: parsed.data.fullName,
    email: parsed.data.email,
    phone: parsed.data.phone,
    service: parsed.data.service,
    location: parsed.data.location,
    details: parsed.data.details
  });

  void sendAdminEnquiryAlert({
    reference,
    fullName: parsed.data.fullName,
    email: parsed.data.email,
    phone: parsed.data.phone,
    service: parsed.data.service,
    location: parsed.data.location,
    details: parsed.data.details
  });

  return NextResponse.json({ ok: true, reference }, { status: 201 });
}
