// Backend-specific retry utilities

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
    // Retry on network errors, timeouts, and 5xx server errors
    return (
      error.code === 'ECONNRESET' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT' ||
      (error.response && error.response.status >= 500)
    );
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

// Specific retry configurations for different operations
export const EMAIL_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 2000,
  maxDelay: 15000,
  backoffFactor: 2,
  retryCondition: (error: any) => {
    // Retry on network errors and temporary email service issues
    return (
      error.code === 'ECONNRESET' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ETIMEDOUT' ||
      error.responseCode === 421 || // Service not available
      error.responseCode === 450 || // Mailbox busy
      error.responseCode === 451    // Local error
    );
  }
};

export const DATABASE_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 2,
  baseDelay: 500,
  maxDelay: 2000,
  backoffFactor: 2,
  retryCondition: (error: any) => {
    // Retry on database lock errors
    return (
      error.code === 'SQLITE_BUSY' ||
      error.code === 'SQLITE_LOCKED'
    );
  }
};

export const FILE_OPERATION_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 5000,
  backoffFactor: 1.5,
  retryCondition: (error: any) => {
    // Retry on file system errors
    return (
      error.code === 'EBUSY' ||
      error.code === 'EMFILE' ||
      error.code === 'ENFILE' ||
      error.code === 'EACCES'
    );
  }
};

// Retry decorator for class methods
export function Retry(config: Partial<RetryConfig> = {}) {
  return function (_target: any, _propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return withRetry(() => method.apply(this, args), config);
    };
  };
}

// Circuit breaker pattern for preventing cascading failures
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly recoveryTimeout: number = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN - service temporarily unavailable');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState(): string {
    return this.state;
  }

  getFailureCount(): number {
    return this.failures;
  }

  reset(): void {
    this.failures = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = 0;
  }
}