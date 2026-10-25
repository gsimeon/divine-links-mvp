import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Dynamic mock store for simulating atomic operations and rollback
const mockEnquiry = {
  id: "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d",
  reference: "DL-ABCD1234",
  full_name: "Amara Okonkwo",
  email: "amara@example.com",
  phone: "+447911123456",
  location: "Enugu Central",
  service: "wisp_redundancy",
  audience: "business",
  details: "Backup connection required",
  status: "submitted",
  internal_notes: "Initial review pending",
  assigned_to: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

let simulateAuditFailure = false;
let simulateRpcAvailable = false;
let lastRolledBackStatus: string | null = null;
let lastDeletedTables: string[] = [];

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
      rpc: vi.fn(async (fnName: string, args: Record<string, unknown>) => {
        if (!simulateRpcAvailable) {
          return { data: null, error: { code: "PGRST202", message: "Function not found" } };
        }
        if (fnName === "admin_update_enquiry") {
          const prev = mockEnquiry.status;
          mockEnquiry.status = String(args.p_status);
          return {
            data: {
              enquiry: { ...mockEnquiry },
              previous_status: prev,
              status_changed: prev !== args.p_status,
              audit_id: "mock-audit-id"
            },
            error: null
          };
        }
        if (fnName === "admin_delete_enquiry_gdpr") {
          lastDeletedTables.push("notifications_outbox", "enquiry_audit_events", "enquiries");
          return { data: true, error: null };
        }
        return { data: null, error: { code: "P0001", message: "RPC Error" } };
      }),
      from: vi.fn((table: string) => {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn(async () => {
            if (table === "enquiries") {
              return { data: { ...mockEnquiry }, error: null };
            }
            return { data: null, error: null };
          }),
          update: vi.fn((payload: Record<string, unknown>) => {
            if (payload.status && payload.status === "submitted" && mockEnquiry.status !== "submitted") {
              lastRolledBackStatus = payload.status;
            }
            Object.assign(mockEnquiry, payload);
            return {
              eq: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn(async () => ({ data: { ...mockEnquiry }, error: null }))
            };
          }),
          insert: vi.fn(async () => {
            if (table === "enquiry_audit_events" && simulateAuditFailure) {
              return { data: null, error: { code: "23505", message: "Audit constraint violation" } };
            }
            return { data: [{ id: "audit-1" }], error: null };
          }),
          delete: vi.fn(() => {
            lastDeletedTables.push(table);
            return {
              eq: vi.fn(async () => ({ error: null }))
            };
          })
        };
      })
    }))
  };
});

describe("Atomic Operations & Audit Integrity", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: "https://mock.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "mock-service-key"
    };
    mockEnquiry.status = "submitted";
    mockEnquiry.internal_notes = "Initial review pending";
    simulateAuditFailure = false;
    simulateRpcAvailable = false;
    lastRolledBackStatus = null;
    lastDeletedTables = [];
  });

  it("completes atomic status change and audit event via database RPC when available", async () => {
    simulateRpcAvailable = true;
    const { PATCH } = await import("@/app/api/admin/enquiries/route");
    const req = new NextRequest("http://localhost:3000/api/admin/enquiries", {
      method: "PATCH",
      headers: {
        Authorization: "Bearer valid-admin-token",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: mockEnquiry.id,
        status: "under_review",
        internalNotes: "Verified coordinates with carrier"
      })
    });

    const res = await PATCH(req);
    expect(res).toBeDefined();
    expect(res!.status).toBe(200);
    const body = await res!.json();
    expect(body.atomic).toBe(true);
    expect(body.auditLogged).toBe(true);
    expect(body.enquiry.status).toBe("under_review");
  });

  it("fails closed with 502 and correlationId when RPC fails and fallback is disabled", async () => {
    simulateRpcAvailable = false; // RPC missing/failed
    delete process.env.ALLOW_SCHEMA_FALLBACK;

    const { PATCH } = await import("@/app/api/admin/enquiries/route");
    const req = new NextRequest("http://localhost:3000/api/admin/enquiries", {
      method: "PATCH",
      headers: {
        Authorization: "Bearer valid-admin-token",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: mockEnquiry.id,
        status: "under_review",
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

  it("rolls back enquiry status update if audit event write fails when fallback is explicitly permitted", async () => {
    simulateRpcAvailable = false; // Exercises the compensation fallback
    simulateAuditFailure = true;  // Simulates audit table write failure
    process.env.ALLOW_SCHEMA_FALLBACK = "true";

    const { PATCH } = await import("@/app/api/admin/enquiries/route");
    const req = new NextRequest("http://localhost:3000/api/admin/enquiries", {
      method: "PATCH",
      headers: {
        Authorization: "Bearer valid-admin-token",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: mockEnquiry.id,
        status: "under_review",
        internalNotes: "Should trigger rollback"
      })
    });

    const res = await PATCH(req);
    expect(res).toBeDefined();
    expect(res!.status).toBe(500);
    const body = await res!.json();
    expect(body.error).toContain("Audit trail write failed");
    expect(lastRolledBackStatus).toBe("submitted");
  });

  it("executes atomic GDPR hard deletion via RPC", async () => {
    simulateRpcAvailable = true;
    const { POST } = await import("@/app/api/admin/enquiries/gdpr/route");
    const req = new NextRequest("http://localhost:3000/api/admin/enquiries/gdpr", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid-admin-token",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: mockEnquiry.id,
        action: "delete"
      })
    });

    const res = await POST(req);
    expect(res).toBeDefined();
    expect(res!.status).toBe(200);
    const body = await res!.json();
    expect(body.ok).toBe(true);
    expect(body.message).toContain("atomic");
  });

  it("fails closed on GDPR deletion when RPC fails and fallback is disabled", async () => {
    simulateRpcAvailable = false;
    delete process.env.ALLOW_SCHEMA_FALLBACK;

    const { POST } = await import("@/app/api/admin/enquiries/gdpr/route");
    const req = new NextRequest("http://localhost:3000/api/admin/enquiries/gdpr", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid-admin-token",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: mockEnquiry.id,
        action: "delete"
      })
    });

    const res = await POST(req);
    expect(res).toBeDefined();
    expect(res!.status).toBe(502);
    const body = await res!.json();
    expect(body.error).toContain("deletion transaction failed");
    expect(body.correlationId).toBeDefined();
  });

  it("deletes dependent tables in strict foreign key order during fallback GDPR erasure when permitted", async () => {
    simulateRpcAvailable = false;
    process.env.ALLOW_SCHEMA_FALLBACK = "true";

    const { POST } = await import("@/app/api/admin/enquiries/gdpr/route");
    const req = new NextRequest("http://localhost:3000/api/admin/enquiries/gdpr", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid-admin-token",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: mockEnquiry.id,
        action: "delete"
      })
    });

    const res = await POST(req);
    expect(res).toBeDefined();
    expect(res!.status).toBe(200);
    const body = await res!.json();
    expect(body.ok).toBe(true);

    // Strict order: outbox -> audit events -> enquiries
    expect(lastDeletedTables).toEqual(["notifications_outbox", "enquiry_audit_events", "enquiries"]);
  });
});
