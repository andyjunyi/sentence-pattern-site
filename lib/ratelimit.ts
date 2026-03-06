/**
 * lib/ratelimit.ts
 * Simple in-memory rate limiter (no external dependencies).
 * Resets per IP per time window.
 *
 * Note: in-memory state is per-process. In a serverless environment each
 * cold-start gets a fresh Map, so this gives per-instance limiting —
 * sufficient to block runaway clients. For cross-instance limits, swap in
 * Upstash Redis (@upstash/ratelimit) later without changing call sites.
 */

interface Record { count: number; resetTime: number }

const store = new Map<string, Record>()

export function checkRateLimit(
  ip: string,
  maxRequests = 20,
  windowMs = 60_000,
): boolean {
  const now = Date.now()
  const rec = store.get(ip)

  if (!rec || now > rec.resetTime) {
    store.set(ip, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (rec.count >= maxRequests) return false

  rec.count++
  return true
}
