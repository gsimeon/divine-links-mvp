import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { trackSchema } from "@/lib/schemas";
import { getClientIp, checkRateLimit } from "@/lib/rate-limiter";

export const runtime = "nodejs";

function getTimelineInfo(status: string) {
  switch (status) {
    case "submitted":
      return {
        step: 1,
        title: "Enquiry Submitted",
        description: "Your enquiry has been received and is queued for preliminary review by our technical team.",
        nextAction: "Initial specifications review by operations staff"
      };
    case "under_review":
      return {
        step: 2,
        title: "Under Technical Review",
        description: "Our engineers are analyzing your requirements against local carrier backhaul paths and frequency corridors.",
        nextAction: "Carrying out telecom infrastructure check for your district"
      };
    case "awaiting_partner":
      return {
        step: 3,
        title: "Carrier Infrastructure Check",
        description: "We are verifying physical line-of-sight and fibre availability directly with carrier wholesale partners.",
        nextAction: "Awaiting partner confirmation on line feasibility"
      };
    case "awaiting_customer":
      return {
        step: 3,
        title: "Additional Details Requested",
        description: "A team member has contacted you or requested clarification regarding site readiness or equipment preferences.",
        nextAction: "Please reply to our staff email or phone call"
      };
    case "in_progress":
      return {
        step: 4,
        title: "Solution & Quote Prepared",
        description: "A tailored connectivity recommendation has been prepared and our team is in direct communication with you.",
        nextAction: "Proposal and schedule review"
      };
    case "completed":
      return {
        step: 5,
        title: "Enquiry Completed",
        description: "This enquiry has been fulfilled or transitioned into an active deployment arrangement.",
        nextAction: "No further action required"
      };
    case "cancelled":
    case "unable_to_fulfil":
      return {
        step: 0,
        title: status === "cancelled" ? "Enquiry Closed" : "Unable to Fulfil",
        description: status === "cancelled"
          ? "This enquiry was cancelled upon customer or operational request."
          : "Following carrier feasibility assessment, suitable telecom backhaul could not be verified at this location at this time.",
        nextAction: "Contact privacy@divinelinks.co for questions"
      };
    default:
      return {
        step: 2,
        title: "In Review",
        description: "Your request is currently being handled by our team.",
        nextAction: "Follow-up in progress"
      };
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateResult = await checkRateLimit(ip, "tracking");
  if (!rateResult.allowed) {
    return NextResponse.json(
      { error: "Too many lookup attempts. Please wait a few minutes." },
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
    return NextResponse.json({ error: "Please submit a valid request." }, { status: 400 });
  }

  const parsed = trackSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please provide a valid reference (e.g. DL-XXXXXXXX) and your email address." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // In local test/development mode when Supabase is unconfigured:
  if (!url || !serviceKey) {
    return NextResponse.json({
      error: "The tracking service is not connected to a live database yet. Please contact support at ops@divinelinks.co."
    }, { status: 503 });
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data, error } = await supabase
    .from("enquiries")
    .select("reference, full_name, email, service, location, status, created_at, updated_at")
    .eq("reference", parsed.data.reference.toUpperCase().trim())
    .eq("email", parsed.data.email.toLowerCase().trim())
    .maybeSingle();

  if (error) {
    console.error("Enquiry tracking lookup failed", { code: error.code });
    return NextResponse.json({ error: "Unable to retrieve status at this moment. Please try again later." }, { status: 502 });
  }

  if (!data) {
    return NextResponse.json({
      error: "No enquiry found matching this reference number and email address. Please check both fields."
    }, { status: 404 });
  }

  const timeline = getTimelineInfo(data.status);

  return NextResponse.json({
    ok: true,
    enquiry: {
      reference: data.reference,
      service: data.service,
      location: data.location,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      timeline
    }
  });
}
