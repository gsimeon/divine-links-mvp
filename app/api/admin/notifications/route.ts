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

  const history = getNotificationHistory();
  return NextResponse.json({ notifications: history });
}
