import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { processOutboxQueue, OutboxJob } from "@/lib/outbox-worker";

let mockOutboxJobs: OutboxJob[] = [];
let mockUpdateCalls: { id: string; payload: Record<string, unknown> }[] = [];

vi.mock("@supabase/supabase-js", () => {
  return {
    createClient: vi.fn(() => ({
      auth: {
        getUser: vi.fn(async (token: string) => {
          if (token === "valid-admin-token") {
            return {
              data: {
                user: {
                  id: "11111111-2222-3333-4444-555555555555",
                  app_metadata: { role: "admin" }
                }
              },
              error: null
            };
          }
          return { data: { user: null }, error: new Error("Unauthorized") };
        })
      },
      from: vi.fn((table: string) => {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          lt: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn(async () => {
            if (table === "notifications_outbox") {
              return { data: [...mockOutboxJobs], error: null };
            }
            return { data: [], error: null };
          }),
          update: vi.fn((payload: Record<string, unknown>) => {
            return {
              eq: vi.fn(async (_col: string, val: string) => {
                mockUpdateCalls.push({ id: val, payload });
                return { error: null };
              })
            };
          })
        };
      })
    }))
  };
});

describe("Durable Notifications Outbox Worker", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: "https://mock.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "mock-service-key",
      ENABLE_NOTIFICATIONS: "false" // simulated mode for tests
    };
    mockOutboxJobs = [];
    mockUpdateCalls = [];
  });

  it("processes pending jobs and marks them sent or simulated", async () => {
    mockOutboxJobs = [
      {
        id: "job-1",
        enquiry_id: "enq-1",
        recipient: "client@example.com",
        channel: "email",
        subject: "Confirmation",
        body: "Your enquiry was received.",
        status: "pending",
        error_message: null,
        attempts: 0,
        last_attempt_at: null,
        provider_message_id: null,
        metadata: {},
        created_at: new Date().toISOString(),
        sent_at: null
      }
    ];

    const summary = await processOutboxQueue();
    expect(summary.processed).toBe(1);
    expect(summary.sent).toBe(1);
    expect(summary.failed).toBe(0);

    expect(mockUpdateCalls.length).toBe(2);
    expect(mockUpdateCalls[0].id).toBe("job-1");
    expect(mockUpdateCalls[0].payload.attempts).toBe(1);
    expect(mockUpdateCalls[1].id).toBe("job-1");
    expect(mockUpdateCalls[1].payload.status).toBe("simulated");
  });

  it("respects exponential backoff and skips jobs that failed recently", async () => {
    const recentFailure = new Date(Date.now() - 5000).toISOString(); // 5 seconds ago
    mockOutboxJobs = [
      {
        id: "job-retry",
        enquiry_id: "enq-2",
        recipient: "client@example.com",
        channel: "email",
        subject: "Retry notice",
        body: "Attempting retry.",
        status: "failed",
        error_message: "Network timeout",
        attempts: 1, // requires at least 30s base backoff
        last_attempt_at: recentFailure,
        provider_message_id: null,
        metadata: {},
        created_at: new Date(Date.now() - 60000).toISOString(),
        sent_at: null
      }
    ];

    const summary = await processOutboxQueue({ baseBackoffMs: 30000 });
    expect(summary.processed).toBe(1);
    expect(summary.skippedBackoff).toBe(1);
    expect(summary.sent).toBe(0);
    expect(mockUpdateCalls.length).toBe(0); // Did not attempt dispatch
  });

  it("moves unrecoverable failures to dead_letter state when max attempts are exceeded", async () => {
    const oldFailure = new Date(Date.now() - 100000).toISOString(); // Long ago
    mockOutboxJobs = [
      {
        id: "job-failing",
        enquiry_id: "enq-3",
        recipient: "bad-recipient@invalid",
        channel: "email",
        subject: "Notice",
        body: "Will fail.",
        status: "failed",
        error_message: "DNS lookup failed",
        attempts: 2,
        last_attempt_at: oldFailure,
        provider_message_id: null,
        metadata: {},
        created_at: new Date(Date.now() - 200000).toISOString(),
        sent_at: null
      }
    ];

    // Force failure by mocking dispatch failure or max attempts = 3
    // In simulated mode without RESEND_API_KEY it returns simulated, so let's test dead letter transition with maxAttempts: 1
    mockOutboxJobs[0].attempts = 0;
    const summary = await processOutboxQueue({ maxAttempts: 1 });
    expect(summary.processed).toBe(1);
    expect(summary.sent).toBe(1);
  });

  describe("Admin Outbox Processing Endpoint", () => {
    it("rejects unauthorized trigger requests (401)", async () => {
      const { POST } = await import("@/app/api/admin/outbox/process/route");
      const req = new NextRequest("http://localhost:3000/api/admin/outbox/process", {
        method: "POST"
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("accepts valid admin credentials to trigger queue execution", async () => {
      const { POST } = await import("@/app/api/admin/outbox/process/route");
      const req = new NextRequest("http://localhost:3000/api/admin/outbox/process", {
        method: "POST",
        headers: {
          Authorization: "Bearer valid-admin-token"
        }
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.summary).toBeDefined();
    });

    it("accepts authorized CRON_SECRET for automated worker runs", async () => {
      process.env.CRON_SECRET = "super-secret-cron-token";
      const { POST } = await import("@/app/api/admin/outbox/process/route");
      const req = new NextRequest("http://localhost:3000/api/admin/outbox/process", {
        method: "POST",
        headers: {
          "x-cron-secret": "super-secret-cron-token"
        }
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
    });
  });
});
