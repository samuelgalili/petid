import { useState, useCallback, useRef } from 'react';
import { useToast } from './use-toast';

interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

interface RetryState {
  attemptCount: number;
  lastError: Error | null;
  isRetrying: boolean;
  nextRetryAt: Date | null;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Payment retry hook with exponential backoff
 */
export const usePaymentRetry = (config: Partial<RetryConfig> = {}) => {
  const { toast } = useToast();
  const opts = { ...DEFAULT_CONFIG, ...config };
  
  const [state, setState] = useState<RetryState>({
    attemptCount: 0,
    lastError: null,
    isRetrying: false,
    nextRetryAt: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const calculateDelay = useCallback((attempt: number): number => {
    const delay = opts.baseDelayMs * Math.pow(opts.backoffMultiplier, attempt);
    return Math.min(delay, opts.maxDelayMs);
  }, [opts]);

  const sleep = useCallback((ms: number, signal?: AbortSignal): Promise<void> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, ms);
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new DOMException('Aborted', 'AbortError'));
        });
      }
    });
  }, []);

  const executeWithRetry = useCallback(async <T>(
    operation: (signal?: AbortSignal) => Promise<T>,
    onProgress?: (attempt: number, maxAttempts: number) => void
  ): Promise<T> => {
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setState(prev => ({ ...prev, attemptCount: 0, lastError: null, isRetrying: true }));

    for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
      try {
        onProgress?.(attempt + 1, opts.maxAttempts);
        setState(prev => ({ ...prev, attemptCount: attempt + 1 }));
        
        const result = await operation(signal);
        
        setState(prev => ({ ...prev, isRetrying: false, lastError: null }));
        return result;
      } catch (error: any) {
        // Don't retry if aborted
        if (error.name === 'AbortError') {
          setState(prev => ({ ...prev, isRetrying: false }));
          throw error;
        }

        // Don't retry certain errors
        if (isNonRetryableError(error)) {
          setState(prev => ({ ...prev, isRetrying: false, lastError: error }));
          throw error;
        }

        setState(prev => ({ ...prev, lastError: error }));

        // Check if we have more attempts
        if (attempt < opts.maxAttempts - 1) {
          const delay = calculateDelay(attempt);
          const nextRetry = new Date(Date.now() + delay);
          
          setState(prev => ({ ...prev, nextRetryAt: nextRetry }));
          
          toast({
            title: `ניסיון ${attempt + 1}/${opts.maxAttempts} נכשל`,
            description: `מנסה שוב בעוד ${Math.ceil(delay / 1000)} שניות...`,
            variant: "default",
          });

          await sleep(delay, signal);
        }
      }
    }

    setState(prev => ({ ...prev, isRetrying: false }));
    throw new Error(`הפעולה נכשלה לאחר ${opts.maxAttempts} ניסיונות`);
  }, [opts, calculateDelay, sleep, toast]);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setState(prev => ({ ...prev, isRetrying: false, nextRetryAt: null }));
    toast({
      title: "הפעולה בוטלה",
      variant: "default",
    });
  }, [toast]);

  const reset = useCallback(() => {
    setState({
      attemptCount: 0,
      lastError: null,
      isRetrying: false,
      nextRetryAt: null,
    });
  }, []);

  return {
    ...state,
    executeWithRetry,
    cancel,
    reset,
    remainingAttempts: opts.maxAttempts - state.attemptCount,
  };
};

// Helper to determine if error should not be retried
function isNonRetryableError(error: any): boolean {
  const nonRetryableCodes = [
    'CARD_DECLINED',
    'INSUFFICIENT_FUNDS',
    'INVALID_CARD',
    'EXPIRED_CARD',
    'AUTHENTICATION_REQUIRED',
    'FRAUD_SUSPECTED',
  ];

  const errorCode = error.code || error.message;
  return nonRetryableCodes.some(code => 
    errorCode?.includes(code) || error.message?.includes(code)
  );
}

export default usePaymentRetry;
