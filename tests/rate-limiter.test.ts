import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  rateLimited,
  resetRateLimits,
  getClientIp,
  checkRateLimit,
  RATE_LIMIT,
  RATE_WINDOW_MS,
  RATE_LIMITS,
  isValidIp
} from "@/lib/rate-limiter";

describe("Production Rate Limiter & Trusted Client IP", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  describe("Client IP Resolution & Anti-Spoofing", () => {
    it("extracts direct CF-Connecting-IP over any X-Forwarded-For entries", () => {
      const req = new NextRequest("http://localhost:3000/api/enquiries", {
        headers: {
          "cf-connecting-ip": "198.51.100.42",
          "x-forwarded-for": "1.1.1.1, 2.2.2.2"
        }
      });
      expect(getClientIp(req)).toBe("198.51.100.42");
    });

    it("extracts X-Real-IP when present and valid", () => {
      const req = new NextRequest("http://localhost:3000/api/enquiries", {
        headers: {
          "x-real-ip": "198.51.100.99"
        }
      });
      expect(getClientIp(req)).toBe("198.51.100.99");
    });

    it("prevents X-Forwarded-For spoofing by inspecting from trusted proxy boundary", () => {
      // Attacker sends header with fake IP prepended: "spoofed-ip, real-client-ip"
      // Behind 1 trusted edge proxy, the rightmost hop added before proxy is authoritative
      const req = new NextRequest("http://localhost:3000/api/enquiries", {
        headers: {
          "x-forwarded-for": "203.0.113.1, 198.51.100.25"
        }
      });
      const resolved = getClientIp(req, { trustedProxyCount: 1 });
      expect(resolved).toBe("198.51.100.25");
      expect(resolved).not.toBe("203.0.113.1");
    });

    it("strips port numbers from IPv4 addresses", () => {
      const req = new NextRequest("http://localhost:3000/api/enquiries", {
        headers: {
          "x-real-ip": "192.0.2.1:443"
        }
      });
      expect(getClientIp(req)).toBe("192.0.2.1");
    });

    it("validates IPv6 addresses correctly", () => {
      expect(isValidIp("2001:0db8:85a3:0000:0000:8a2e:0370:7334")).toBe(true);
      expect(isValidIp("::1")).toBe(true);
      expect(isValidIp("invalid-ip-string")).toBe(false);
    });

    it("isolates unidentified clients when no IP header is provided instead of pooling under loopback", () => {
      const req = new NextRequest("http://localhost:3000/api/enquiries");
      expect(getClientIp(req)).toBe("unidentified");
      expect(getClientIp(req, { defaultIp: "127.0.0.1" })).toBe("127.0.0.1");
    });

    it("verifies proxy provider boundaries against forged edge headers", () => {
      const forgedReq = new NextRequest("http://localhost:3000/api/enquiries", {
        headers: {
          "cf-connecting-ip": "1.2.3.4",
          "x-vercel-forwarded-for": "5.6.7.8"
        }
      });

      // When configured for Vercel, attacker's spoofed cf-connecting-ip is ignored
      expect(getClientIp(forgedReq, { trustedProxyProvider: "vercel" })).toBe("5.6.7.8");

      // When configured for Cloudflare, cf-connecting-ip is authoritative
      expect(getClientIp(forgedReq, { trustedProxyProvider: "cloudflare" })).toBe("1.2.3.4");
    });
  });

  describe("Multi-Tier Independent Rate Limiting", () => {
    it("enforces independent quotas between enquiry submissions and tracking lookups", async () => {
      const ip = "198.51.100.50";
      const now = 1000000;

      // Exhaust enquiry limit (limit is 5)
      for (let i = 0; i < RATE_LIMITS.enquiry.limit; i++) {
        const res = await checkRateLimit(ip, "enquiry", now);
        expect(res.allowed).toBe(true);
      }
      const enquiryBlocked = await checkRateLimit(ip, "enquiry", now);
      expect(enquiryBlocked.allowed).toBe(false);
      expect(enquiryBlocked.remaining).toBe(0);

      // Tracking limit for same IP should NOT be blocked (independent tier)
      const trackingRes = await checkRateLimit(ip, "tracking", now);
      expect(trackingRes.allowed).toBe(true);
      expect(trackingRes.remaining).toBe(RATE_LIMITS.tracking.limit - 1);
    });

    it("enforces admin tier quotas separately", async () => {
      const ip = "198.51.100.77";
      const now = 2000000;

      const adminRes = await checkRateLimit(ip, "admin", now);
      expect(adminRes.allowed).toBe(true);
      expect(adminRes.limit).toBe(RATE_LIMITS.admin.limit);
    });

    it("returns correct resetTime and remaining count", async () => {
      const ip = "198.51.100.88";
      const now = 3000000;

      const res1 = await checkRateLimit(ip, "enquiry", now);
      expect(res1.remaining).toBe(RATE_LIMITS.enquiry.limit - 1);
      expect(res1.resetTime).toBe(now + RATE_LIMITS.enquiry.windowMs);

      const res2 = await checkRateLimit(ip, "enquiry", now + 1000);
      expect(res2.remaining).toBe(RATE_LIMITS.enquiry.limit - 2);
      expect(res2.resetTime).toBe(now + RATE_LIMITS.enquiry.windowMs);
    });
  });

  describe("Legacy Compatibility & Window Expiry", () => {
    it("allows requests up to the allowed rate limit", () => {
      const ip = "192.168.1.100";
      const now = 1000000;

      for (let i = 0; i < RATE_LIMIT; i++) {
        expect(rateLimited(ip, now)).toBe(false);
      }
    });

    it("blocks requests that exceed the rate limit within the same window", () => {
      const ip = "192.168.1.101";
      const now = 1000000;

      for (let i = 0; i < RATE_LIMIT; i++) {
        expect(rateLimited(ip, now)).toBe(false);
      }
      expect(rateLimited(ip, now)).toBe(true);
      expect(rateLimited(ip, now + 1000)).toBe(true);
    });

    it("resets limits once the time window has elapsed", () => {
      const ip = "192.168.1.102";
      const startTime = 1000000;

      for (let i = 0; i < RATE_LIMIT; i++) {
        expect(rateLimited(ip, startTime)).toBe(false);
      }
      expect(rateLimited(ip, startTime)).toBe(true);

      const afterWindow = startTime + RATE_WINDOW_MS + 100;
      expect(rateLimited(ip, afterWindow)).toBe(false);
    });
  });
});
