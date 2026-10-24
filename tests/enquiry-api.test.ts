import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { POST, resetRateLimits } from "@/app/api/enquiries/route";
import { NextRequest } from "next/server";

describe("POST /api/enquiries Route Handler", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    resetRateLimits();
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  function createRequest(body: unknown, headers: Record<string, string> = {}) {
    return new NextRequest("http://localhost:3000/api/enquiries", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "127.0.0.1",
        ...headers
      },
      body: JSON.stringify(body)
    });
  }

  it("returns 400 for invalid body schema", async () => {
    const req = createRequest({ fullName: "A" });
    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe("Please check the required fields and try again.");
  });

  it("quietly accepts honeypot bot submissions with 200 and reference without DB write", async () => {
    const req = createRequest({
      fullName: "Spam Bot",
      email: "bot@spam.com",
      phone: "+1234567890",
      location: "Cyberspace",
      service: "telecom",
      audience: "individual",
      details: "Spam message promoting services.",
      consent: "yes",
      website: "http://spamlink.com"
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.reference).toMatch(/^DL-[A-Z0-9]{8}$/);
  });

  it("returns 503 when Supabase credentials are not configured", async () => {
    const req = createRequest({
      fullName: "Real User",
      email: "user@example.com",
      phone: "+234 801 234 5678",
      location: "Lekki, Lagos",
      service: "broadband",
      audience: "individual",
      details: "Inquiring about fixed wireless or fibre coverage in Lekki Phase 1.",
      consent: "yes"
    });

    const res = await POST(req);
    expect(res.status).toBe(503);

    const data = await res.json();
    expect(data.error).toContain("The enquiry service is not configured yet.");
  });
});
