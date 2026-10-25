import { NextRequest, NextResponse } from "next/server";
import { processOutboxQueue } from "@/lib/outbox-worker";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * Triggers batch processing of the notifications outbox queue.
 * Protected by admin authorization or CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecretHeader = request.headers.get("x-cron-secret");
  const configuredCronSecret = process.env.CRON_SECRET;

  const isCronAuthorized = Boolean(
    configuredCronSecret &&
    (cronSecretHeader === configuredCronSecret || authHeader === `Bearer ${configuredCronSecret}`)
  );

  if (!isCronAuthorized) {
    const client = getClient();
    if (!client) {
      return NextResponse.json({ error: "Service is not configured." }, { status: 503 });
    }
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
    }
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user || data.user.app_metadata?.role !== "admin") {
      return NextResponse.json({ error: "You do not have permission to access this area." }, { status: 403 });
    }
  }

  const summary = await processOutboxQueue();
  return NextResponse.json({ ok: true, summary });
}
