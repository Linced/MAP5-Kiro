// Frontend-specific retry utilities
// React hook for network status
import { useState, useEffect } from 'react';

// Frontend retry configuration interface
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // in milliseconds
  maxDelay: number; // in milliseconds
  backoffFactor: number;
  retryCondition?: (error: any) => boolean;
}

// Default retry configuration for frontend
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2,
  retryCondition: (error: any) => {
    // Retry on network errors and 5xx server errors
    if (!error.response) {
      // Network error (no response from server)
      return true;
    }
    
    const status = error.response.status;
    // Retry on server errors (5xx) and some client errors
    return status >= 500 || status === 408 || status === 429;
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
    } catch (error) {
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
export const API_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 8000,
  backoffFactor: 2,
  retryCondition: (error: any) => {
    // Don't retry authentication errors or client errors (except timeouts and rate limits)
    if (error.response) {
      const status = error.response.status;
      return status >= 500 || status === 408 || status === 429;
    }
    // Retry network errors
    return true;
  }
};

export const FILE_UPLOAD_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 2,
  baseDelay: 2000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryCondition: (error: any) => {
    // Only retry on network errors and server errors for file uploads
    if (!error.response) return true;
    const status = error.response.status;
    return status >= 500;
  }
};

// Retry hook for React components
export function useRetry() {
  return {
    withRetry,
    retryConfigs: {
      api: API_RETRY_CONFIG,
      fileUpload: FILE_UPLOAD_RETRY_CONFIG,
      default: DEFAULT_RETRY_CONFIG
    }
  };
}

// Network status detection
export class NetworkMonitor {
  private static instance: NetworkMonitor;
  private isOnline = navigator.onLine;
  private listeners: Array<(isOnline: boolean) => void> = [];

  private constructor() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  static getInstance(): NetworkMonitor {
    if (!NetworkMonitor.instance) {
      NetworkMonitor.instance = new NetworkMonitor();
    }
    return NetworkMonitor.instance;
  }

  private handleOnline = () => {
    this.isOnline = true;
    this.notifyListeners();
  };

  private handleOffline = () => {
    this.isOnline = false;
    this.notifyListeners();
  };

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.isOnline));
  }

  getStatus(): boolean {
    return this.isOnline;
  }

  subscribe(listener: (isOnline: boolean) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Test network connectivity
  async testConnectivity(url: string = '/api/health'): Promise<boolean> {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        cache: 'no-cache'
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const monitor = NetworkMonitor.getInstance();
    const unsubscribe = monitor.subscribe(setIsOnline);
    
    return unsubscribe;
  }, []);
  
  return isOnline;
}

// Queue for offline operations
export class OfflineQueue {
  private static instance: OfflineQueue;
  private queue: Array<{
    id: string;
    operation: () => Promise<any>;
    retryConfig?: RetryConfig;
    timestamp: number;
  }> = [];
  private isProcessing = false;

  private constructor() {
    const monitor = NetworkMonitor.getInstance();
    monitor.subscribe((isOnline) => {
      if (isOnline && !this.isProcessing) {
        this.processQueue();
      }
    });
  }

  static getInstance(): OfflineQueue {
    if (!OfflineQueue.instance) {
      OfflineQueue.instance = new OfflineQueue();
    }
    return OfflineQueue.instance;
  }

  add(operation: () => Promise<any>, retryConfig?: RetryConfig): string {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 11);
    
    this.queue.push({
      id,
      operation,
      retryConfig,
      timestamp: Date.now()
    });

    // Try to process immediately if online
    if (NetworkMonitor.getInstance().getStatus()) {
      this.processQueue();
    }

    return id;
  }

  remove(id: string): boolean {
    const index = this.queue.findIndex(item => item.id === id);
    if (index > -1) {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      
      try {
        if (item.retryConfig) {
          await withRetry(item.operation, item.retryConfig);
        } else {
          await item.operation();
        }
        console.log(`Offline operation ${item.id} completed successfully`);
      } catch (error) {
        console.error(`Offline operation ${item.id} failed:`, error);
        // Optionally re-queue failed operations
      }
    }

    this.isProcessing = false;
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
  }
}