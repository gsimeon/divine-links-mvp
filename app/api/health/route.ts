import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { areNotificationsEnabled } from "@/lib/notifications";

export const runtime = "nodejs";

const STALE_LEASE_MS = 5 * 60 * 1000; // 5 minutes

export interface OutboxQueueMetrics {
  pending: number;
  processing: number;
  failed: number;
  deadLetter: number;
  staleProcessing: number;
  lastAttemptAt: string | null;
  status: "healthy" | "attention_required";
}

export async function GET() {
  const start = Date.now();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let dbStatus: "connected" | "disconnected" | "not_configured" = "not_configured";
  let dbLatencyMs: number | null = null;

  let queueMetrics: OutboxQueueMetrics = {
    pending: 0,
    processing: 0,
    failed: 0,
    deadLetter: 0,
    staleProcessing: 0,
    lastAttemptAt: null,
    status: "healthy"
  };

  if (url && serviceKey) {
    try {
      const dbStart = Date.now();
      const supabase = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      // 1. Connectivity probe
      const { error: dbError } = await supabase.from("enquiries").select("id").limit(1);
      dbLatencyMs = Date.now() - dbStart;
      dbStatus = dbError ? "disconnected" : "connected";

      // 2. Operational outbox queue health metrics (queued messages, failed deliveries, stale jobs)
      if (dbStatus === "connected") {
        const { data: outboxRows, error: outboxError } = await supabase
          .from("notifications_outbox")
          .select("status, attempts, last_attempt_at, claimed_at, created_at")
          .order("created_at", { ascending: false })
          .limit(100);

        if (!outboxError && outboxRows) {
          const now = Date.now();
          for (const row of outboxRows) {
            if (row.status === "pending") {
              queueMetrics.pending++;
            } else if (row.status === "processing") {
              queueMetrics.processing++;
              if (row.claimed_at && now - new Date(row.claimed_at).getTime() > STALE_LEASE_MS) {
                queueMetrics.staleProcessing++;
              }
            } else if (row.status === "failed") {
              queueMetrics.failed++;
            } else if (row.status === "dead_letter") {
              queueMetrics.deadLetter++;
            }

            if (row.last_attempt_at) {
              if (!queueMetrics.lastAttemptAt || row.last_attempt_at > queueMetrics.lastAttemptAt) {
                queueMetrics.lastAttemptAt = row.last_attempt_at;
              }
            }
          }

          if (queueMetrics.deadLetter > 0 || queueMetrics.staleProcessing > 0) {
            queueMetrics.status = "attention_required";
          }
        }
      }
    } catch {
      dbStatus = "disconnected";
    }
  }

  const isHealthy = dbStatus === "connected";

  const payload = {
    status: isHealthy ? (queueMetrics.status === "attention_required" ? "warning" : "ok") : "degraded",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    services: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs
      },
      notifications: {
        liveEnabled: areNotificationsEnabled(),
        provider: process.env.RESEND_API_KEY ? "resend" : "simulated",
        queue: queueMetrics
      },
      rateLimiter: {
        store: (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
          ? "upstash_redis"
          : "in_memory",
        outagePolicy: process.env.REDIS_OUTAGE_POLICY || "fail_safe",
        proxyProvider: process.env.TRUSTED_PROXY_PROVIDER || (process.env.VERCEL === "1" ? "vercel" : "none"),
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
