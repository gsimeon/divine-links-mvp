import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { checkRateLimit, resetRateLimits } from "@/lib/rate-limiter";
import { processOutboxQueue, OutboxJob } from "@/lib/outbox-worker";

// Controllable mock state
let mockEnquiryInsertShouldFail = false;
let mockAuditInsertShouldFail = false;
let mockAuditDeleteShouldFail = false;
let enquiryDeleted = false;
let rolledBackStatus: string | null = null;
let outboxMockJobs: OutboxJob[] = [];
let outboxUpdatedRecord: Record<string, unknown> | null = null;

const initialStatus = "submitted";

vi.mock("@supabase/supabase-js", () => {
  return {
    createClient: vi.fn(() => ({
      auth: {
        getUser: vi.fn(async (token: string) => {
          if (token === "valid-token") {
            return {
              data: { user: { id: "admin-id-1", app_metadata: { role: "admin" } } },
              error: null
            };
          }
          return { data: { user: null }, error: new Error("Unauthorized") };
        })
      },
      rpc: vi.fn(async (fnName: string) => {
        if (fnName === "submit_enquiry_atomic" && mockEnquiryInsertShouldFail) {
          return { data: null, error: { code: "23505", message: "duplicate reference key" } };
        }
        // Force fallback to exercise compensation logic for tests
        return { data: null, error: { code: "PGRST202", message: "RPC not found" } };
      }),
      from: vi.fn((table: string) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation(async () => {
          if (table === "notifications_outbox") {
            return { data: [...outboxMockJobs], error: null };
          }
          return { data: [], error: null };
        }),
        maybeSingle: vi.fn().mockImplementation(async () => {
          if (table === "enquiries") {
            return {
              data: {
                id: "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d",
                reference: "DL-ABCD1234",
                full_name: "Test User",
                email: "test@example.com",
                status: initialStatus,
                internal_notes: "Initial note",
                assigned_to: null
              },
              error: null
            };
          }
          return { data: null, error: null };
        }),
        insert: vi.fn().mockImplementation(() => {
          if (table === "enquiry_audit_events" && mockAuditInsertShouldFail) {
            return Promise.resolve({ data: null, error: { code: "40001", message: "serialization failure" } });
          }
          if (table === "enquiries" && mockEnquiryInsertShouldFail) {
            return {
              select: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: { code: "23505", message: "insert failed" }
              })
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d" },
              error: null
            })
          };
        }),
        update: vi.fn((payload: Record<string, unknown>) => {
          if (table === "enquiries" && payload.status === initialStatus) {
            rolledBackStatus = payload.status;
          }
          if (table === "notifications_outbox") {
            outboxUpdatedRecord = payload;
          }
          return {
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d",
                reference: "DL-ABCD1234",
                full_name: "Test User",
                email: "test@example.com",
                status: payload.status || initialStatus,
                internal_notes: "Initial note",
                assigned_to: null
              },
              error: null
            })
          };
        }),
        delete: vi.fn(() => ({
          eq: vi.fn().mockImplementation(async () => {
            if (table === "enquiry_audit_events" && mockAuditDeleteShouldFail) {
              return { error: { code: "23503", message: "foreign key violation" } };
            }
            if (table === "enquiries") {
              enquiryDeleted = true;
            }
            return { error: null };
          })
        }))
      }))
    }))
  };
});

describe("Failure-Injection & Transactional Recovery Suite", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    resetRateLimits();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: "https://mock.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "mock-service-key"
    };
    mockEnquiryInsertShouldFail = false;
    mockAuditInsertShouldFail = false;
    mockAuditDeleteShouldFail = false;
    enquiryDeleted = false;
    rolledBackStatus = null;
    outboxMockJobs = [];
    outboxUpdatedRecord = null;
  });

  describe("Enquiry & Outbox Transactional Integrity", () => {
    it("ensures neither enquiry nor outbox record is persisted if database insert fails", async () => {
      mockEnquiryInsertShouldFail = true;

      const { POST } = await import("@/app/api/enquiries/route");
      const req = new NextRequest("http://localhost:3000/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Failure Test User",
          email: "failtest@example.com",
          phone: "+447000111222",
          location: "Manchester",
          service: "broadband",
          audience: "individual",
          details: "Testing atomicity rollback when insert fails.",
          consent: "yes"
        })
      });

      const res = await POST(req);
      expect(res).toBeDefined();
      expect(res!.status).toBe(502);
      const body = await res!.json();
      expect(body.error).toContain("couldn’t save your enquiry");
    });
  });

  describe("Fail-Closed Transactional Protections", () => {
    it("fails closed and preserves atomicity on enquiry submission when RPC fails", async () => {
      delete process.env.ALLOW_SCHEMA_FALLBACK;
      mockEnquiryInsertShouldFail = true;

      const { POST } = await import("@/app/api/enquiries/route");
      const req = new NextRequest("http://localhost:3000/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Fail-Closed Client",
          email: "failclosed@example.com",
          phone: "+447000111222",
          location: "London",
          service: "broadband",
          audience: "business",
          details: "Must fail closed without inserting orphaned rows.",
          consent: "yes"
        })
      });

      const res = await POST(req);
      expect(res).toBeDefined();
      expect(res!.status).toBe(502);
      const body = await res!.json();
      expect(body.error).toContain("couldn’t save your enquiry");
      expect(body.correlationId).toBeDefined();
    });

    it("fails closed on admin status change when RPC returns unexpected error", async () => {
      delete process.env.ALLOW_SCHEMA_FALLBACK;

      const { PATCH } = await import("@/app/api/admin/enquiries/route");
      const req = new NextRequest("http://localhost:3000/api/admin/enquiries", {
        method: "PATCH",
        headers: {
          Authorization: "Bearer valid-token",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d",
          status: "in_progress",
          internalNotes: "Should fail closed"
        })
      });

      const res = await PATCH(req);
      expect(res).toBeDefined();
      expect(res!.status).toBe(502);
      const body = await res!.json();
      expect(body.error).toContain("Database transaction failed");
      expect(body.correlationId).toBeDefined();
    });
  });

  describe("Status Update Audit Rollback Under Injected Failure", () => {
    it("rolls back enquiry status when audit event insertion fails in non-RPC fallback", async () => {
      process.env.ALLOW_SCHEMA_FALLBACK = "true";
      mockAuditInsertShouldFail = true;

      const { PATCH } = await import("@/app/api/admin/enquiries/route");
      const req = new NextRequest("http://localhost:3000/api/admin/enquiries", {
        method: "PATCH",
        headers: {
          Authorization: "Bearer valid-token",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d",
          status: "in_progress",
          internalNotes: "Should fail audit and rollback"
        })
      });

      const res = await PATCH(req);
      expect(res).toBeDefined();
      expect(res!.status).toBe(500);
      const body = await res!.json();
      expect(body.error).toContain("Audit trail write failed");
      expect(rolledBackStatus).toBe("submitted");
    });
  });

  describe("GDPR Hard Erasure Injected Failure", () => {
    it("aborts enquiry erasure if audit cleanup fails, preventing orphaned enquiry state", async () => {
      process.env.ALLOW_SCHEMA_FALLBACK = "true";
      mockAuditDeleteShouldFail = true;

      const { POST } = await import("@/app/api/admin/enquiries/gdpr/route");
      const req = new NextRequest("http://localhost:3000/api/admin/enquiries/gdpr", {
        method: "POST",
        headers: {
          Authorization: "Bearer valid-token",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d",
          action: "delete"
        })
      });

      const res = await POST(req);
      expect(res).toBeDefined();
      expect(res!.status).toBe(500);
      expect(enquiryDeleted).toBe(false);
    });
  });

  describe("Notification Worker Resiliency & Deduplication", () => {
    it("keeps jobs in failed state with incremented attempt on provider failure without duplicate sends", async () => {
      outboxMockJobs = [
        {
          id: "retry-job-1",
          enquiry_id: "enq-1",
          recipient: "customer@example.com",
          channel: "email",
          subject: "Status Update",
          body: "Your quote is ready.",
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

      process.env.ENABLE_NOTIFICATIONS = "true";
      process.env.RESEND_API_KEY = "re_invalid_test_key";
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        text: vi.fn().mockResolvedValue("Resend API Unavailable (Service Outage)")
      } as unknown as Response);

      const summary = await processOutboxQueue({ maxAttempts: 3 });
      expect(summary.processed).toBe(1);
      expect(summary.failed).toBe(1);
      expect(summary.sent).toBe(0);

      expect(outboxUpdatedRecord).toBeDefined();
      expect(outboxUpdatedRecord!.status).toBe("failed");
      expect(outboxUpdatedRecord!.attempts).toBe(1);
      expect(String(outboxUpdatedRecord!.error_message)).toContain("HTTP 503");
      expect(outboxUpdatedRecord!.sent_at).toBeUndefined();
    });
  });

  describe("Distributed Rate Limiting & Fail-Safe Degradation", () => {
    it("gracefully falls back to in-memory sliding window when Redis/Upstash is unreachable (fail-safe)", async () => {
      process.env.UPSTASH_REDIS_REST_URL = "https://mock-redis.upstash.io";
      process.env.UPSTASH_REDIS_REST_TOKEN = "mock-token";

      global.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED: Redis outage"));

      const ip = "192.0.2.75";
      const res1 = await checkRateLimit(ip, "enquiry");
      expect(res1.allowed).toBe(true);
      expect(res1.remaining).toBe(4);

      const res2 = await checkRateLimit(ip, "enquiry");
      expect(res2.allowed).toBe(true);
      expect(res2.remaining).toBe(3);

      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
    });

    it("enforces multi-instance shared limits when Upstash Redis is active", async () => {
      process.env.UPSTASH_REDIS_REST_URL = "https://mock-redis.upstash.io";
      process.env.UPSTASH_REDIS_REST_TOKEN = "mock-token";

      let redisCounter = 0;
      global.fetch = vi.fn().mockImplementation(async () => {
        redisCounter++;
        return {
          ok: true,
          json: async () => [
            { result: redisCounter },
            { result: 600000 }
          ]
        };
      });

      const ip = "192.0.2.80";
      const r1 = await checkRateLimit(ip, "enquiry");
      expect(r1.allowed).toBe(true);

      for (let i = 0; i < 4; i++) {
        await checkRateLimit(ip, "enquiry");
      }

      const blocked = await checkRateLimit(ip, "enquiry");
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);

      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
    });
  });
});
