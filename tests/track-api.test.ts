import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { trackSchema } from "@/lib/schemas";
import { POST } from "@/app/api/track/route";
import { resetRateLimits } from "@/lib/rate-limiter";
import { NextRequest } from "next/server";

describe("Customer Enquiry Tracking & Verification", () => {
  describe("trackSchema validation", () => {
    it("accepts valid reference and email", () => {
      const result = trackSchema.safeParse({
        reference: "DL-12345678",
        email: "user@example.com"
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reference).toBe("DL-12345678");
        expect(result.data.email).toBe("user@example.com");
      }
    });

    it("rejects invalid emails", () => {
      const result = trackSchema.safeParse({
        reference: "DL-12345678",
        email: "not-an-email"
      });
      expect(result.success).toBe(false);
    });

    it("rejects references that are too short", () => {
      const result = trackSchema.safeParse({
        reference: "DL",
        email: "user@example.com"
      });
      expect(result.success).toBe(false);
    });
  });

  describe("POST /api/track handler", () => {
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

    function createTrackRequest(body: unknown) {
      return new NextRequest("http://localhost:3000/api/track", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "127.0.0.1"
        },
        body: JSON.stringify(body)
      });
    }

    it("returns 400 for malformed lookup body", async () => {
      const req = createTrackRequest({ reference: "" });
      const res = await POST(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error).toContain("Please provide a valid reference");
    });

    it("returns 503 when live database credentials are absent", async () => {
      const req = createTrackRequest({
        reference: "DL-A1B2C3D4",
        email: "user@example.com"
      });
      const res = await POST(req);
      expect(res.status).toBe(503);

      const body = await res.json();
      expect(body.error).toContain("not connected to a live database yet");
    });
  });
});
