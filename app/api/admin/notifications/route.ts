import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getNotificationHistory } from "@/lib/notifications";

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

  if (data.user.app_metadata?.role !== "admin") {
    return { error: NextResponse.json({ error: "You do not have permission to access this area." }, { status: 403 }) };
  }
  return { client, userId: data.user.id };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  // 1. Attempt to query durable Supabase notifications_outbox table
  const { data: outboxRows, error: outboxError } = await auth.client
    .from("notifications_outbox")
    .select("id, recipient, channel, subject, body, status, error_message, attempts, metadata, created_at, sent_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (!outboxError && outboxRows && outboxRows.length > 0) {
    const formatted = outboxRows.map(row => ({
      id: row.id,
      channel: row.channel,
      recipient: row.recipient,
      subject: row.subject,
      body: row.body,
      simulated: row.status === "simulated",
      deliveryStatus: row.status,
      timestamp: row.created_at,
      metadata: row.metadata
    }));
    return NextResponse.json({ notifications: formatted, source: "database" });
  }

  // 2. Fallback to in-memory history if outbox table is not yet migrated
  const history = getNotificationHistory();
  return NextResponse.json({ notifications: history, source: "memory" });
}
