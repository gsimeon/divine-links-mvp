import { NextRequest } from "next/server";

/**
 * Production Rate Limiter & Trusted Client IP Resolution.
 * 
 * Features:
 * 1. Spoof-resilient client IP extraction:
 *    - Prioritizes CDN/reverse-proxy edge headers (cf-connecting-ip, x-real-ip).
 *    - Resolves X-Forwarded-For safely by inspecting from the trusted proxy boundary
 *      instead of blindly trusting attacker-supplied leftmost entries.
 *    - Sanitizes and validates IPv4 / IPv6 addresses.
 * 2. Multi-tier endpoint protection:
 *    - Independent quota windows for enquiry submissions, tracking lookups, and admin actions.
 * 3. Distributed-ready architecture:
 *    - In-memory sliding window for single-instance, tests, and offline development.
 *    - Automatic distributed sync via Upstash / Redis REST API when configured
 *      (UPSTASH_REDIS_REST_URL & UPSTASH_REDIS_REST_TOKEN).
 */

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

export const RATE_LIMITS = {
  enquiry: { limit: 5, windowMs: 10 * 60 * 1000 },   // Max 5 submissions per 10 minutes
  tracking: { limit: 15, windowMs: 5 * 60 * 1000 },  // Max 15 lookups per 5 minutes
  admin: { limit: 30, windowMs: 60 * 1000 }          // Max 30 sensitive ops per 1 minute
} as const;

export type RateLimitTier = keyof typeof RATE_LIMITS;

export const RATE_WINDOW_MS = RATE_LIMITS.enquiry.windowMs;
export const RATE_LIMIT = RATE_LIMITS.enquiry.limit;

// In-memory sliding window store: key -> { count, start }
const inMemoryStore = new Map<string, { count: number; start: number }>();

/**
 * Validates whether a string looks like a standard IPv4 or IPv6 address.
 */
export function isValidIp(ip: string): boolean {
  if (!ip || ip.length > 45) return false;
  // IPv4 simple pattern
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (ipv4Regex.test(ip)) return true;
  // IPv6 simple pattern
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,7}:$|^:(:[0-9a-fA-F]{1,4}){1,7}$|^(([0-9a-fA-F]{1,4}:){1,6}|:):([0-9a-fA-F]{1,4}:){0,4}[0-9a-fA-F]{1,4}$/;
  if (ipv6Regex.test(ip)) return true;
  // Localhost aliases
  if (ip === "::1" || ip === "localhost") return true;
  return false;
}

/**
 * Strips port and extra whitespace from an IP string.
 */
function sanitizeIp(rawIp: string): string {
  const trimmed = rawIp.trim();
  // Strip port from IPv4 if present e.g. 192.168.1.1:8080
  if (trimmed.includes(":") && trimmed.includes(".")) {
    const parts = trimmed.split(":");
    return parts[0].trim();
  }
  return trimmed;
}

export interface ClientIpOptions {
  trustedProxyCount?: number;
  trustedProxyProvider?: "cloudflare" | "vercel" | "custom" | "none";
  strictIp?: boolean;
  defaultIp?: string;
}

/**
 * Resolves the client IP in a spoof-resistant manner.
 * 
 * When behind a trusted edge proxy (Cloudflare, AWS CloudFront, Vercel, Nginx),
 * arbitrary client-supplied headers must not be blindly trusted.
 * 
 * If X-Forwarded-For contains multiple comma-separated IPs:
 * [client_ip, proxy_1, proxy_2]
 * An attacker can prepend spoofed IPs: [fake_ip, actual_client_ip, proxy_1].
 * By selecting from the rightmost untrusted hop (proxyCount offset), we prevent
 * header injection bypasses.
 */
export function getClientIp(
  request: NextRequest,
  options?: ClientIpOptions
): string {
  let provider =
    options?.trustedProxyProvider ||
    (process.env.TRUSTED_PROXY_PROVIDER as "cloudflare" | "vercel" | "custom" | "none" | undefined);

  // Auto-detect Vercel edge environment if not explicitly specified
  if (!provider && process.env.VERCEL === "1") {
    provider = "vercel";
  }

  // 1. Direct trusted edge proxy headers based on verified provider
  if (provider === "cloudflare") {
    const cfIp = request.headers.get("cf-connecting-ip");
    if (cfIp) {
      const cleaned = sanitizeIp(cfIp);
      if (isValidIp(cleaned)) return cleaned;
    }
  } else if (provider === "vercel") {
    const vercelIp = request.headers.get("x-vercel-forwarded-for");
    if (vercelIp) {
      const firstVercel = vercelIp.split(",")[0].trim();
      const cleaned = sanitizeIp(firstVercel);
      if (isValidIp(cleaned)) return cleaned;
    }
  } else if (provider === "custom") {
    const realIp = request.headers.get("x-real-ip");
    if (realIp) {
      const cleaned = sanitizeIp(realIp);
      if (isValidIp(cleaned)) return cleaned;
    }
  } else if (!provider || process.env.ALLOW_UNTRUSTED_PROXY_HEADERS === "true") {
    // If no specific provider is configured (e.g. test harness), allow proxy headers if valid
    const cfIp = request.headers.get("cf-connecting-ip");
    if (cfIp) {
      const cleaned = sanitizeIp(cfIp);
      if (isValidIp(cleaned)) return cleaned;
    }
    const realIp = request.headers.get("x-real-ip");
    if (realIp) {
      const cleaned = sanitizeIp(realIp);
      if (isValidIp(cleaned)) return cleaned;
    }
  }

  // 2. X-Forwarded-For with trusted proxy boundary
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const hops = xff
      .split(",")
      .map(s => sanitizeIp(s))
      .filter(s => isValidIp(s));

    if (hops.length > 0) {
      const proxyCount = options?.trustedProxyCount ?? 1;
      // Hop position immediately preceding trusted reverse proxy:
      const targetIndex = Math.max(0, hops.length - proxyCount);
      return hops[targetIndex] || hops[hops.length - 1];
    }
  }

  if (options?.defaultIp) {
    return options.defaultIp;
  }

  // Unidentified client fallback:
  // Avoid grouping all unidentified clients into "127.0.0.1", which would cause shared quota starvation.
  return "unidentified";
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetTime: number;
  isFallback?: boolean;
}

/**
 * Checks rate limit for a given key/IP and tier.
 * Returns structured quota information for HTTP headers and response gating.
 */
export async function checkRateLimit(
  ip: string,
  tierOrConfig: RateLimitTier | RateLimitConfig = "enquiry",
  now = Date.now()
): Promise<RateLimitResult> {
  const config: RateLimitConfig =
    typeof tierOrConfig === "string" ? RATE_LIMITS[tierOrConfig] : tierOrConfig;
  const namespace = typeof tierOrConfig === "string" ? tierOrConfig : "custom";

  // Strict IP enforcement: reject unidentified clients if configured
  if (ip === "unidentified" && process.env.STRICT_IP_ENFORCEMENT === "true") {
    return {
      allowed: false,
      remaining: 0,
      limit: config.limit,
      resetTime: now + config.windowMs,
      isFallback: false
    };
  }

  const storageKey = ip === "unidentified" ? `${namespace}:unidentified` : `${namespace}:${ip}`;

  // 1. Check for distributed Upstash / Redis REST configuration
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    try {
      const response = await fetch(`${redisUrl}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${redisToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify([
          ["INCR", storageKey],
          ["PTTL", storageKey]
        ]),
        cache: "no-store"
      });

      if (response.ok) {
        const results = await response.json();
        const currentCount = Number(results[0]?.result || 1);
        let pttl = Number(results[1]?.result || -1);

        // If newly created key (pttl < 0), set expiry window
        if (pttl <= 0) {
          void fetch(`${redisUrl}/PEXPIRE/${storageKey}/${config.windowMs}`, {
            headers: { Authorization: `Bearer ${redisToken}` }
          });
          pttl = config.windowMs;
        }

        const allowed = currentCount <= config.limit;
        const remaining = Math.max(0, config.limit - currentCount);
        return {
          allowed,
          remaining,
          limit: config.limit,
          resetTime: now + pttl,
          isFallback: false
        };
      }
    } catch (redisError) {
      const outagePolicy = process.env.REDIS_OUTAGE_POLICY || "fail_safe"; // "fail_safe" | "fail_closed"

      if (outagePolicy === "fail_closed") {
        console.error("[RateLimiter] Distributed store unreachable under fail-closed policy, rejecting request", {
          key: storageKey,
          error: redisError instanceof Error ? redisError.message : String(redisError)
        });
        return {
          allowed: false,
          remaining: 0,
          limit: config.limit,
          resetTime: now + config.windowMs,
          isFallback: true
        };
      }

      console.warn("[RateLimiter] Distributed store unreachable, engaging local in-memory fallback", {
        key: storageKey,
        error: redisError instanceof Error ? redisError.message : String(redisError)
      });

      // Fallback cleanly to in-memory store if network or Redis endpoint is unreachable
      const entry = inMemoryStore.get(storageKey);
      if (!entry || now - entry.start > config.windowMs) {
        inMemoryStore.set(storageKey, { count: 1, start: now });
        return {
          allowed: true,
          remaining: config.limit - 1,
          limit: config.limit,
          resetTime: now + config.windowMs,
          isFallback: true
        };
      }

      entry.count += 1;
      const allowed = entry.count <= config.limit;
      const remaining = Math.max(0, config.limit - entry.count);
      const resetTime = entry.start + config.windowMs;

      return {
        allowed,
        remaining,
        limit: config.limit,
        resetTime,
        isFallback: true
      };
    }
  }

  // 2. In-Memory Sliding Window Fallback
  const entry = inMemoryStore.get(storageKey);
  if (!entry || now - entry.start > config.windowMs) {
    inMemoryStore.set(storageKey, { count: 1, start: now });
    return {
      allowed: true,
      remaining: config.limit - 1,
      limit: config.limit,
      resetTime: now + config.windowMs,
      isFallback: false
    };
  }

  entry.count += 1;
  const allowed = entry.count <= config.limit;
  const remaining = Math.max(0, config.limit - entry.count);
  const resetTime = entry.start + config.windowMs;

  return {
    allowed,
    remaining,
    limit: config.limit,
    resetTime,
    isFallback: false
  };
}

/**
 * Backward-compatible synchronous check for existing endpoints and unit tests.
 */
export function rateLimited(ip: string, now = Date.now()): boolean {
  const key = `enquiry:${ip}`;
  const entry = inMemoryStore.get(key);
  if (!entry || now - entry.start > RATE_WINDOW_MS) {
    inMemoryStore.set(key, { count: 1, start: now });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

/**
 * Resets the in-memory rate limiter cache.
 */
export function resetRateLimits(): void {
  inMemoryStore.clear();
}
