// Server-side rate limiting utilities for Edge Functions
// Note: This is a reference file - actual implementation is in edge functions

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterMs?: number;
}

// Pre-configured rate limit configs
export const RATE_LIMITS = {
  auth: { maxRequests: 5, windowMs: 60000, keyPrefix: 'auth' },
  api: { maxRequests: 60, windowMs: 60000, keyPrefix: 'api' },
  scrape: { maxRequests: 10, windowMs: 60000, keyPrefix: 'scrape' },
  ai: { maxRequests: 20, windowMs: 60000, keyPrefix: 'ai' },
  upload: { maxRequests: 30, windowMs: 60000, keyPrefix: 'upload' },
  sensitive: { maxRequests: 3, windowMs: 60000, keyPrefix: 'sensitive' },
};
