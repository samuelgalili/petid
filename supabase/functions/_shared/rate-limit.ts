// Shared rate limiting utilities for Edge Functions
// Uses in-memory storage with fallback for serverless environments

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds?: number;
}

// In-memory rate limit storage (resets on cold start)
// For persistent rate limiting, use database-backed approach
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

/**
 * Check rate limit using in-memory store
 * @param identifier - Unique identifier (IP, user_id, or combination)
 * @param action - Action being rate limited
 * @param config - Rate limit configuration
 */
export function checkRateLimit(
  identifier: string,
  action: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = `${action}:${identifier}`;
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  
  const record = rateLimitStore.get(key);
  
  // If no record or window has expired, start fresh
  if (!record || (now - record.windowStart) >= windowMs) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: new Date(now + windowMs),
    };
  }
  
  // Check if limit exceeded
  if (record.count >= config.maxRequests) {
    const resetAt = new Date(record.windowStart + windowMs);
    const retryAfterSeconds = Math.ceil((resetAt.getTime() - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfterSeconds,
    };
  }
  
  // Increment counter
  record.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetAt: new Date(record.windowStart + windowMs),
  };
}

/**
 * Get client IP address from request headers
 */
export function getClientIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

/**
 * Create a rate limit exceeded response
 */
export function rateLimitExceededResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: "Too many requests. Please try again later.",
      retryAfter: result.retryAfterSeconds,
      resetAt: result.resetAt.toISOString(),
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfterSeconds || 60),
        "X-RateLimit-Reset": result.resetAt.toISOString(),
        "X-RateLimit-Remaining": "0",
        ...corsHeaders,
      },
    }
  );
}

// Pre-configured rate limit configs
export const RATE_LIMITS = {
  // Authentication endpoints
  sendOtp: { maxRequests: 3, windowSeconds: 900 }, // 3 per 15 min
  verifyOtp: { maxRequests: 5, windowSeconds: 900 }, // 5 per 15 min
  
  // Sensitive operations  
  generateApiKey: { maxRequests: 3, windowSeconds: 3600 }, // 3 per hour
  uploadAvatar: { maxRequests: 10, windowSeconds: 3600 }, // 10 per hour
  deleteUser: { maxRequests: 5, windowSeconds: 60 }, // 5 per minute
  
  // General API
  pushNotification: { maxRequests: 20, windowSeconds: 60 }, // 20 per minute
  payment: { maxRequests: 5, windowSeconds: 60 }, // 5 per minute
  crmCharge: { maxRequests: 5, windowSeconds: 60 }, // 5 per minute
  
  // Default
  default: { maxRequests: 60, windowSeconds: 60 }, // 60 per minute
};

/**
 * Cleanup old entries from rate limit store (call periodically)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  for (const [key, record] of rateLimitStore.entries()) {
    if (now - record.windowStart > maxAge) {
      rateLimitStore.delete(key);
    }
  }
}
