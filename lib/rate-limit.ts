// Lightweight in-memory rate limiter for Next.js API routes.
// Uses a fixed window counter keyed by identifier (IP, userId, or composite).
// Automatically cleans up expired entries to prevent memory leaks.

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 60 s
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 60_000).unref?.();

/**
 * Returns true if the request is within the allowed rate limit.
 * Returns false if the limit has been exceeded.
 *
 * @param identifier - Unique key (e.g. "login:127.0.0.1" or "ai:userId")
 * @param limit      - Max requests per window
 * @param windowMs   - Time window in milliseconds
 */
export function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now > entry.resetAt) {
    store.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count += 1;
  return true;
}

/** Seconds remaining until the rate-limit window resets (0 if no entry). */
export function getRateLimitResetSeconds(identifier: string): number {
  const entry = store.get(identifier);
  if (!entry) return 0;
  return Math.max(0, Math.ceil((entry.resetAt - Date.now()) / 1000));
}
