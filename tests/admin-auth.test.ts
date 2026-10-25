import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Supabase client to simulate role checks and missing tokens
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
          if (token === "regular-user-token") {
            return {
              data: {
                user: {
                  id: "99999999-8888-7777-6666-555555555555",
                  app_metadata: { role: "customer" } // NOT an admin!
                }
              },
              error: null
            };
          }
          return { data: { user: null }, error: new Error("Invalid token") };
        })
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null })
      })),
      rpc: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST202" } })
    }))
  };
});

describe("Admin Authorization & Security Controls", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: "https://mock.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "mock-service-key"
    };
  });

  it("rejects admin requests with missing Authorization header (401)", async () => {
    const { GET } = await import("@/app/api/admin/notifications/route");
    const req = new NextRequest("http://localhost:3000/api/admin/notifications");

    const res = await GET(req);
    expect(res).toBeDefined();
    expect(res!.status).toBe(401);
    const body = await res!.json();
    expect(body.error).toContain("Sign in is required");
  });

  it("rejects non-admin authenticated users lacking app_metadata.role = 'admin' (403)", async () => {
    const { GET } = await import("@/app/api/admin/notifications/route");
    const req = new NextRequest("http://localhost:3000/api/admin/notifications", {
      headers: {
        Authorization: "Bearer regular-user-token"
      }
    });

    const res = await GET(req);
    expect(res).toBeDefined();
    expect(res!.status).toBe(403);
    const body = await res!.json();
    expect(body.error).toContain("do not have permission");
  });

  it("authorizes valid admin sessions with app_metadata.role = 'admin' (200)", async () => {
    const { GET } = await import("@/app/api/admin/notifications/route");
    const req = new NextRequest("http://localhost:3000/api/admin/notifications", {
      headers: {
        Authorization: "Bearer valid-admin-token"
      }
    });

    const res = await GET(req);
    expect(res).toBeDefined();
    expect(res!.status).toBe(200);
    const body = await res!.json();
    expect(Array.isArray(body.notifications)).toBe(true);
  });
});
