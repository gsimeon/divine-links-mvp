import { describe, it, expect, beforeEach } from "vitest";
import { rateLimited, resetRateLimits, RATE_LIMIT, RATE_WINDOW_MS } from "@/app/api/enquiries/route";

describe("Enquiry Rate Limiter", () => {
  beforeEach(() => {
    resetRateLimits();
  });

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

    // Next attempt should be blocked
    expect(rateLimited(ip, now)).toBe(true);
    // Subsequent attempt is also blocked
    expect(rateLimited(ip, now + 1000)).toBe(true);
  });

  it("resets limits once the time window has elapsed", () => {
    const ip = "192.168.1.102";
    const startTime = 1000000;

    for (let i = 0; i < RATE_LIMIT; i++) {
      expect(rateLimited(ip, startTime)).toBe(false);
    }
    expect(rateLimited(ip, startTime)).toBe(true);

    // After RATE_WINDOW_MS + 1ms, limit should reset
    const afterWindow = startTime + RATE_WINDOW_MS + 100;
    expect(rateLimited(ip, afterWindow)).toBe(false);
  });

  it("tracks different IP addresses independently", () => {
    const ip1 = "10.0.0.1";
    const ip2 = "10.0.0.2";
    const now = 1000000;

    for (let i = 0; i < RATE_LIMIT; i++) {
      expect(rateLimited(ip1, now)).toBe(false);
    }
    expect(rateLimited(ip1, now)).toBe(true);

    // ip2 should still be allowed
    expect(rateLimited(ip2, now)).toBe(false);
  });
});
