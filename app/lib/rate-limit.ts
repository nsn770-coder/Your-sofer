// ============================================
// Simple Rate Limiter (In-Memory)
// ============================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (TODO: migrate to Redis for production / horizontal scaling)
const store = new Map<string, RateLimitEntry>();

export function checkRateLimit(
  identifier: string,
  windowSeconds: number = 3600,
  maxRequests: number = 5
): { allowed: boolean; remaining: number; resetAt: Date } {
  const now = Date.now();
  const key = `${identifier}`;
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    const resetAt = now + windowSeconds * 1000;
    store.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: new Date(resetAt),
    };
  }

  // Same window
  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(entry.resetAt),
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: new Date(entry.resetAt),
  };
}

/**
 * Cleanup old entries (call periodically)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

// Run cleanup every hour
if (typeof globalThis !== 'undefined') {
  setInterval(cleanupRateLimitStore, 60 * 60 * 1000);
}
