import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/health/route";

let mockDbSuccess = true;

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation(async () => {
        if (!mockDbSuccess) {
          return { data: null, error: { message: "Connection refused" } };
        }
        return { data: [{ id: "mock-id" }], error: null };
      })
    }))
  }))
}));

describe("GET /api/health Endpoint", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    mockDbSuccess = true;
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: "https://mock.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "mock-service-key"
    };
  });

  it("returns 200 and healthy status when database is reachable", async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.services.database.status).toBe("connected");
    expect(body.services.notifications).toBeDefined();
    expect(body.services.rateLimiter).toBeDefined();
    expect(typeof body.responseTimeMs).toBe("number");
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
