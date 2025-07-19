// Shared retry utilities between frontend and backend
// This eliminates duplication and ensures consistency

// Retry configuration interface
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // in milliseconds
  maxDelay: number; // in milliseconds
  backoffFactor: number;
  retryCondition?: (error: any) => boolean;
}

// Default retry configuration
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2,
  retryCondition: (error: any) => {
    // Default retry condition - network errors and server errors
    if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
      // Frontend environment
      if (!error.response) {
        return true; // Network error
      }
      const status = error.response.status;
      return status >= 500 || status === 408 || status === 429;
    } else {
      // Backend environment
      return (
        error.code === 'ECONNRESET' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT' ||
        (error.response && error.response.status >= 500)
      );
    }
  }
};

// Sleep utility
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Calculate delay with exponential backoff and jitter
function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.baseDelay * Math.pow(config.backoffFactor, attempt - 1);
  const jitter = Math.random() * 0.1 * exponentialDelay; // Add up to 10% jitter
  const delay = Math.min(exponentialDelay + jitter, config.maxDelay);
  return Math.floor(delay);
}

// Generic retry function
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: any;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Check if we should retry this error
      if (!finalConfig.retryCondition || !finalConfig.retryCondition(error)) {
        throw error;
      }

      // Don't wait after the last attempt
      if (attempt === finalConfig.maxAttempts) {
        break;
      }

      const delay = calculateDelay(attempt, finalConfig);
      console.warn(`Operation failed (attempt ${attempt}/${finalConfig.maxAttempts}), retrying in ${delay}ms:`, error.message);
      
      await sleep(delay);
    }
  }

  // If we get here, all attempts failed
  throw lastError;
}

// Predefined retry configurations
export const RETRY_CONFIGS = {
  // API requests
  api: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 8000,
    backoffFactor: 2,
    retryCondition: (error: any) => {
      if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
        // Frontend
        if (!error.response) return true;
        const status = error.response.status;
        return status >= 500 || status === 408 || status === 429;
      } else {
        // Backend
        return (
          error.code === 'ECONNRESET' ||
          error.code === 'ENOTFOUND' ||
          error.code === 'ETIMEDOUT' ||
          (error.response && error.response.status >= 500)
        );
      }
    }
  },

  // Email operations
  email: {
    maxAttempts: 3,
    baseDelay: 2000,
    maxDelay: 15000,
    backoffFactor: 2,
    retryCondition: (error: any) => {
      return (
        error.code === 'ECONNRESET' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ETIMEDOUT' ||
        error.responseCode === 421 || // Service not available
        error.responseCode === 450 || // Mailbox busy
        error.responseCode === 451    // Local error
      );
    }
  },

  // Database operations
  database: {
    maxAttempts: 2,
    baseDelay: 500,
    maxDelay: 2000,
    backoffFactor: 2,
    retryCondition: (error: any) => {
      return (
        error.code === 'SQLITE_BUSY' ||
        error.code === 'SQLITE_LOCKED'
      );
    }
  },

  // File operations
  fileOperation: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 5000,
    backoffFactor: 1.5,
    retryCondition: (error: any) => {
      return (
        error.code === 'EBUSY' ||
        error.code === 'EMFILE' ||
        error.code === 'ENFILE' ||
        error.code === 'EACCES'
      );
    }
  },

  // File upload (frontend specific)
  fileUpload: {
    maxAttempts: 2,
    baseDelay: 2000,
    maxDelay: 10000,
    backoffFactor: 2,
    retryCondition: (error: any) => {
      if (!error.response) return true;
      const status = error.response.status;
      return status >= 500;
    }
  }
} as const;

// Retry decorator for class methods (backend only)
export function Retry(config: Partial<RetryConfig> = {}) {
  return function (_target: any, _propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return withRetry(() => method.apply(this, args), config);
    };
  };
}