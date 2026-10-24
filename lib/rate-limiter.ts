const windowMap = new Map<string, { count: number; start: number }>();

export const RATE_WINDOW_MS = 10 * 60 * 1000;
export const RATE_LIMIT = 5;

/**
 * Checks whether an IP address has exceeded the in-memory rate limit window.
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
