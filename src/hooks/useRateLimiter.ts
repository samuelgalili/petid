import { useState, useCallback, useRef } from 'react';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimiterResult {
  isAllowed: () => boolean;
  getRemainingRequests: () => number;
  getTimeUntilReset: () => number;
  reset: () => void;
}

/**
 * Client-side rate limiter hook
 * This is for UX purposes only - server-side validation is still required
 */
export const useRateLimiter = (config: RateLimitConfig): RateLimiterResult => {
  const requestTimestamps = useRef<number[]>([]);
  const [, forceUpdate] = useState({});

  const cleanOldRequests = useCallback(() => {
    const now = Date.now();
    requestTimestamps.current = requestTimestamps.current.filter(
      (timestamp) => now - timestamp < config.windowMs
    );
  }, [config.windowMs]);

  const isAllowed = useCallback(() => {
    cleanOldRequests();
    
    if (requestTimestamps.current.length >= config.maxRequests) {
      return false;
    }
    
    requestTimestamps.current.push(Date.now());
    forceUpdate({});
    return true;
  }, [cleanOldRequests, config.maxRequests]);

  const getRemainingRequests = useCallback(() => {
    cleanOldRequests();
    return Math.max(0, config.maxRequests - requestTimestamps.current.length);
  }, [cleanOldRequests, config.maxRequests]);

  const getTimeUntilReset = useCallback(() => {
    if (requestTimestamps.current.length === 0) return 0;
    const oldestRequest = requestTimestamps.current[0];
    const resetTime = oldestRequest + config.windowMs;
    return Math.max(0, resetTime - Date.now());
  }, [config.windowMs]);

  const reset = useCallback(() => {
    requestTimestamps.current = [];
    forceUpdate({});
  }, []);

  return {
    isAllowed,
    getRemainingRequests,
    getTimeUntilReset,
    reset,
  };
};

// Pre-configured rate limiters for common operations
export const useAuthRateLimiter = () => useRateLimiter({ maxRequests: 5, windowMs: 60000 });
export const useApiRateLimiter = () => useRateLimiter({ maxRequests: 30, windowMs: 60000 });
export const useSensitiveActionRateLimiter = () => useRateLimiter({ maxRequests: 3, windowMs: 60000 });
