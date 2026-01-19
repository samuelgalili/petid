/**
 * DEVELOPMENT UTILITIES
 * =====================
 * Guardrails and debugging tools for development mode only.
 * These are tree-shaken in production builds.
 */

/**
 * Log a warning only in development mode
 */
export const devWarn = (message: string, ...args: unknown[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[DEV] ${message}`, ...args);
  }
};

/**
 * Log an error only in development mode
 */
export const devError = (message: string, ...args: unknown[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[DEV] ${message}`, ...args);
  }
};

/**
 * Log info only in development mode
 */
export const devLog = (message: string, ...args: unknown[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV] ${message}`, ...args);
  }
};

/**
 * Assert a condition in development mode
 * Throws an error if condition is false
 */
export const devAssert = (condition: boolean, message: string) => {
  if (process.env.NODE_ENV === 'development' && !condition) {
    throw new Error(`[DEV Assert] ${message}`);
  }
};

/**
 * Validate that required environment variables are set
 */
export const validateEnvVars = (vars: string[]) => {
  if (process.env.NODE_ENV === 'development') {
    const missing = vars.filter(v => !import.meta.env[v]);
    if (missing.length > 0) {
      devWarn(`Missing environment variables: ${missing.join(', ')}`);
    }
  }
};

/**
 * Performance marker for development
 */
export const perfMark = (name: string) => {
  if (process.env.NODE_ENV === 'development') {
    performance.mark(name);
  }
};

/**
 * Performance measure for development
 */
export const perfMeasure = (name: string, startMark: string, endMark?: string) => {
  if (process.env.NODE_ENV === 'development') {
    try {
      if (endMark) {
        performance.measure(name, startMark, endMark);
      } else {
        performance.measure(name, startMark);
      }
      const entries = performance.getEntriesByName(name);
      if (entries.length > 0) {
        devLog(`⏱️ ${name}: ${entries[entries.length - 1].duration.toFixed(2)}ms`);
      }
    } catch (e) {
      // Ignore measurement errors
    }
  }
};

/**
 * Check for duplicate React Query keys in cache
 */
export const checkQueryKeyDuplicates = (queryClient: { getQueryCache: () => { getAll: () => { queryKey: unknown }[] } }) => {
  if (process.env.NODE_ENV === 'development') {
    const cache = queryClient.getQueryCache();
    const keys = cache.getAll().map(q => JSON.stringify(q.queryKey));
    const seen = new Set<string>();
    const duplicates: string[] = [];
    
    keys.forEach(key => {
      if (seen.has(key)) {
        duplicates.push(key);
      }
      seen.add(key);
    });
    
    if (duplicates.length > 0) {
      devWarn('Duplicate query keys detected:', duplicates);
    }
  }
};

/**
 * Create a development-only debug panel data collector
 */
export const createDebugCollector = () => {
  if (process.env.NODE_ENV !== 'development') {
    return {
      log: () => {},
      getAll: () => [],
      clear: () => {},
    };
  }
  
  const logs: { timestamp: Date; message: string; data?: unknown }[] = [];
  
  return {
    log: (message: string, data?: unknown) => {
      logs.push({ timestamp: new Date(), message, data });
      if (logs.length > 100) logs.shift(); // Keep last 100
    },
    getAll: () => [...logs],
    clear: () => { logs.length = 0; },
  };
};

// Global debug collector instance
export const debugCollector = createDebugCollector();
