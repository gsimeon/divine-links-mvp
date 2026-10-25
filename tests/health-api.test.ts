import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/health/route";

let mockDbSuccess = true;
let mockOutboxRows: Record<string, unknown>[] = [];

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      const builder = {
        select: vi.fn(() => builder),
        order: vi.fn(() => builder),
        limit: vi.fn(async () => {
          if (!mockDbSuccess) {
            return { data: null, error: { message: "Connection refused" } };
          }
          if (table === "notifications_outbox") {
            return { data: [...mockOutboxRows], error: null };
          }
          return { data: [{ id: "mock-id" }], error: null };
        })
      };
      return builder;
    })
  }))
}));

describe("GET /api/health Endpoint", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    mockDbSuccess = true;
    mockOutboxRows = [];
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: "https://mock.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "mock-service-key"
    };
  });

  it("returns 200 and healthy status when database is reachable", async () => {
    mockOutboxRows = [
      { status: "pending", attempts: 0, last_attempt_at: null, claimed_at: null },
      { status: "processing", attempts: 1, last_attempt_at: new Date().toISOString(), claimed_at: new Date().toISOString() }
    ];

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.services.database.status).toBe("connected");
    expect(body.services.notifications.queue).toBeDefined();
    expect(body.services.notifications.queue.pending).toBe(1);
    expect(body.services.notifications.queue.processing).toBe(1);
    expect(body.services.notifications.queue.status).toBe("healthy");
    expect(typeof body.responseTimeMs).toBe("number");
  });

  it("returns warning status when dead-letter or stale jobs are detected in outbox queue", async () => {
    const expiredClaim = new Date(Date.now() - 400_000).toISOString(); // 400s ago (> 300s lease)
    mockOutboxRows = [
      { status: "dead_letter", attempts: 3, last_attempt_at: new Date().toISOString(), claimed_at: null },
      { status: "processing", attempts: 1, last_attempt_at: expiredClaim, claimed_at: expiredClaim }
    ];

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe("warning");
    expect(body.services.notifications.queue.deadLetter).toBe(1);
    expect(body.services.notifications.queue.staleProcessing).toBe(1);
    expect(body.services.notifications.queue.status).toBe("attention_required");
  });

  it("returns 503 and degraded status when database is unreachable", async () => {
    mockDbSuccess = false;

    const res = await GET();
    expect(res.status).toBe(503);

    const body = await res.json();
    expect(body.status).toBe("degraded");
    expect(body.services.database.status).toBe("disconnected");
  });

  it("reports in_memory and simulated modes when optional credentials are unset", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.RESEND_API_KEY;
    delete process.env.ENABLE_NOTIFICATIONS;

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.services.rateLimiter.store).toBe("in_memory");
    expect(body.services.notifications.provider).toBe("simulated");
    expect(body.services.notifications.liveEnabled).toBe(false);
  });
});
