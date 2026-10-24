/**
 * In-memory sliding window rate limiter for local development and single-instance deployments.
 * 
 * PRODUCTION ARCHITECTURE NOTE:
 * When scaling across multiple serverless instances (e.g. Vercel, AWS Lambda, Cloud Run),
 * process memory is not shared. For multi-instance production, replace or augment this
 * implementation with a centralized distributed store:
 * 1. Upstash Redis (@upstash/ratelimit) using sliding window algorithm, or
 * 2. Edge / Hosting level WAF / Rate Limiting (e.g. Cloudflare Rate Limiting or Vercel Edge Middleware).
 */
const windowMap = new Map<string, { count: number; start: number }>();

export const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
export const RATE_LIMIT = 5; // Max 5 enquiries per IP per window

export interface RateLimiter {
  rateLimited(ip: string, now?: number): boolean | Promise<boolean>;
  resetRateLimits(): void | Promise<void>;
}

/**
 * Checks whether an IP address has exceeded the rate limit window.
 */
export function rateLimited(ip: string, now = Date.now()): boolean {
  const entry = windowMap.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW_MS) {
    windowMap.set(ip, { count: 1, start: now });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

/**
 * Clears the rate limiter cache (useful for testing and reset).
 */
export function resetRateLimits(): void {
  windowMap.clear();
}
