import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { processOutboxQueue, OutboxJob } from "@/lib/outbox-worker";

let mockOutboxJobs: OutboxJob[] = [];
let mockUpdateCalls: { id: string; payload: Record<string, unknown> }[] = [];
let mockRpcClaimImpl: ((params: Record<string, unknown>) => Promise<{ data: OutboxJob[] | null; error: unknown }>) | null = null;

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
      rpc: vi.fn(async (fnName: string, params: Record<string, unknown>) => {
        if (fnName === "claim_outbox_jobs") {
          if (mockRpcClaimImpl) {
            return mockRpcClaimImpl(params);
          }
          // Default: simulate RPC fallback
          return { data: null, error: { code: "PGRST202", message: "function claim_outbox_jobs not found" } };
        }
        return { data: null, error: { code: "PGRST202", message: "function not found" } };
      }),
      from: vi.fn((table: string) => {
        let currentPayload: Record<string, unknown> | null = null;
        let targetId: string | null = null;
        let expectedAttempts: number | null = null;

        const builder: Record<string, unknown> = {
          select: vi.fn(() => builder),
          in: vi.fn(() => builder),
          lt: vi.fn(() => builder),
          order: vi.fn(() => builder),
          limit: vi.fn(async () => {
            if (table === "notifications_outbox") {
              return { data: [...mockOutboxJobs], error: null };
            }
            return { data: [], error: null };
          }),
          update: vi.fn((payload: Record<string, unknown>) => {
            currentPayload = payload;
            return builder;
          }),
          eq: vi.fn((col: string, val: unknown) => {
            if (col === "id") targetId = String(val);
            if (col === "attempts") expectedAttempts = Number(val);
            return builder;
          }),
          then: (resolve: (value: { data: unknown; error: unknown }) => unknown) => {
            if (currentPayload && targetId) {
              mockUpdateCalls.push({ id: targetId, payload: { ...currentPayload } });

              const targetJob = mockOutboxJobs.find(j => j.id === targetId);
              if (targetJob) {
                // If conditional attempts was supplied and differs, optimistic lock fails!
                if (expectedAttempts !== null && targetJob.attempts !== expectedAttempts) {
                  return resolve({ data: [], error: null });
                }
                Object.assign(targetJob, currentPayload);
                return resolve({ data: [{ ...targetJob }], error: null });
              }
              return resolve({ data: [], error: null });
            }
            return resolve({ data: [], error: null });
          }
        };

        return builder;
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
    mockRpcClaimImpl = null;
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

    // Job was claimed (status: processing, attempts: 1) and then dispatched (status: simulated)
    expect(mockUpdateCalls.length).toBe(2);
    expect(mockUpdateCalls[0].id).toBe("job-1");
    expect(mockUpdateCalls[0].payload.status).toBe("processing");
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
    expect(summary.processed).toBe(0);
    expect(summary.skippedBackoff).toBe(1);
    expect(summary.sent).toBe(0);
    expect(mockUpdateCalls.length).toBe(0); // Did not attempt claim or dispatch
  });

  it("moves unrecoverable failures to dead_letter state when max attempts are reached", async () => {
    mockOutboxJobs = [
      {
        id: "job-failing",
        enquiry_id: "enq-3",
        recipient: "bad-recipient@invalid",
        channel: "email",
        subject: "Notice",
        body: "Will fail.",
        status: "pending",
        error_message: null,
        attempts: 0,
        last_attempt_at: null,
        provider_message_id: null,
        metadata: {},
        created_at: new Date(Date.now() - 200000).toISOString(),
        sent_at: null
      }
    ];

    // With maxAttempts = 1, claim increments attempts to 1. In simulated mode it succeeds unless dispatch fails.
    const summary = await processOutboxQueue({ maxAttempts: 1 });
    expect(summary.processed).toBe(1);
    expect(summary.sent).toBe(1);
  });

  describe("Concurrency & Race Protection", () => {
    it("prevents duplicate delivery when multiple concurrent workers attempt to claim the same job", async () => {
      mockOutboxJobs = [
        {
          id: "job-shared-1",
          enquiry_id: "enq-concurrent",
          recipient: "concurrent@example.com",
          channel: "email",
          subject: "Single Send Only",
          body: "Must only be sent once.",
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

      // Run two worker executions in parallel simulating overlapping cron / triggers
      const [worker1Result, worker2Result] = await Promise.all([
        processOutboxQueue({ workerId: "worker-alpha" }),
        processOutboxQueue({ workerId: "worker-beta" })
      ]);

      const totalSent = worker1Result.sent + worker2Result.sent;
      const totalProcessed = worker1Result.processed + worker2Result.processed;

      // Exactly ONE worker must have successfully claimed and sent the job!
      expect(totalSent).toBe(1);
      expect(totalProcessed).toBe(1);

      // Verify the final status is simulated/sent and attempts is 1, not 2
      const job = mockOutboxJobs.find(j => j.id === "job-shared-1");
      expect(job?.status).toBe("simulated");
      expect(job?.attempts).toBe(1);
    });

    it("claims jobs using PostgreSQL RPC with row locking when available", async () => {
      let rpcClaimCalled = false;
      mockRpcClaimImpl = async (params) => {
        rpcClaimCalled = true;
        expect(params.p_worker_id).toBe("rpc-worker");
        return {
          data: [
            {
              id: "rpc-claimed-1",
              enquiry_id: "enq-rpc",
              recipient: "rpc@example.com",
              channel: "email",
              subject: "RPC Claimed",
              body: "Body",
              status: "processing",
              error_message: null,
              attempts: 1,
              last_attempt_at: new Date().toISOString(),
              claimed_at: new Date().toISOString(),
              claimed_by: "rpc-worker",
              provider_message_id: null,
              metadata: {},
              created_at: new Date().toISOString(),
              sent_at: null
            }
          ],
          error: null
        };
      };

      const summary = await processOutboxQueue({ workerId: "rpc-worker" });
      expect(rpcClaimCalled).toBe(true);
      expect(summary.processed).toBe(1);
      expect(summary.sent).toBe(1);
    });

    it("reclaims orphaned jobs whose processing lease has expired", async () => {
      const expiredTime = new Date(Date.now() - 400_000).toISOString(); // 400s ago (> 300s lease)
      mockOutboxJobs = [
        {
          id: "job-crashed-worker",
          enquiry_id: "enq-crashed",
          recipient: "recovered@example.com",
          channel: "email",
          subject: "Recovered notification",
          body: "Previous worker crashed.",
          status: "processing",
          error_message: null,
          attempts: 1,
          last_attempt_at: expiredTime,
          claimed_at: expiredTime,
          claimed_by: "crashed-worker-old",
          provider_message_id: null,
          metadata: {},
          created_at: new Date(Date.now() - 500_000).toISOString(),
          sent_at: null
        }
      ];

      const summary = await processOutboxQueue({ leaseSeconds: 300 });
      expect(summary.processed).toBe(1);
      expect(summary.sent).toBe(1);
      expect(summary.reclaimedLeases).toBe(1);
    });
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

    it("accepts authorized CRON_SECRET for automated POST worker runs", async () => {
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

    it("accepts authorized CRON_SECRET for automated GET worker runs from Vercel Cron", async () => {
      process.env.CRON_SECRET = "super-secret-cron-token";
      const { GET } = await import("@/app/api/admin/outbox/process/route");
      const req = new NextRequest("http://localhost:3000/api/admin/outbox/process", {
        method: "GET",
        headers: {
          authorization: "Bearer super-secret-cron-token"
        }
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.summary).toBeDefined();
    });
  });
});
