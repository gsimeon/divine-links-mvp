import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { areNotificationsEnabled } from "@/lib/notifications";

export const runtime = "nodejs";

export async function GET() {
  const start = Date.now();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let dbStatus: "connected" | "disconnected" | "not_configured" = "not_configured";
  let dbLatencyMs: number | null = null;

  if (url && serviceKey) {
    try {
      const dbStart = Date.now();
      const supabase = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
      const { error } = await supabase.from("enquiries").select("id").limit(1);
      dbLatencyMs = Date.now() - dbStart;
      dbStatus = error ? "disconnected" : "connected";
    } catch {
      dbStatus = "disconnected";
    }
  }

  const isHealthy = dbStatus === "connected";

  const payload = {
    status: isHealthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    services: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs
      },
      notifications: {
        liveEnabled: areNotificationsEnabled(),
        provider: process.env.RESEND_API_KEY ? "resend" : "simulated"
      },
      rateLimiter: {
        store: (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
          ? "upstash_redis"
          : "in_memory",
        proxyProvider: process.env.TRUSTED_PROXY_PROVIDER || "none",
        strictIp: process.env.STRICT_IP_ENFORCEMENT === "true"
      }
    },
    responseTimeMs: Date.now() - start
  };

  return NextResponse.json(payload, {
    status: isHealthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate"
    }
  });
}
