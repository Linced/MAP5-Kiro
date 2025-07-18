/**
 * Client-side caching service for performance optimization
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheOptions {
  ttl?: number; // Default TTL in milliseconds
  maxSize?: number; // Maximum number of items in cache
}

class CacheService {
  private cache = new Map<string, CacheItem<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes default
  private maxSize = 100; // Maximum cache size

  constructor(options: CacheOptions = {}) {
    this.defaultTTL = options.ttl || this.defaultTTL;
    this.maxSize = options.maxSize || this.maxSize;
  }

  /**
   * Set an item in the cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // Clean up expired items if cache is getting full
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    };

    this.cache.set(key, item);
  }

  /**
   * Get an item from the cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  /**
   * Check if an item exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Remove an item from the cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all items from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clean up expired items
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0 // Would need to track hits/misses for accurate rate
    };
  }

  /**
   * Create a cache key from parameters
   */
  static createKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${JSON.stringify(params[key])}`)
      .join('&');
    
    return `${prefix}:${sortedParams}`;
  }
}

// Create cache instances for different data types
export const dataCache = new CacheService({
  ttl: 2 * 60 * 1000, // 2 minutes for data queries
  maxSize: 50
});

export const uploadCache = new CacheService({
  ttl: 10 * 60 * 1000, // 10 minutes for upload metadata
  maxSize: 20
});

export const calculationCache = new CacheService({
  ttl: 5 * 60 * 1000, // 5 minutes for calculation results
  maxSize: 30
});

export const chartCache = new CacheService({
  ttl: 3 * 60 * 1000, // 3 minutes for chart data
  maxSize: 25
});

export { CacheService };

/**
 * Browser storage caching utilities
 */
export class BrowserCache {
  /**
   * Store data in localStorage with expiration
   */
  static setItem(key: string, data: any, ttlMinutes: number = 60): void {
    try {
      const item = {
        data,
        timestamp: Date.now(),
        ttl: ttlMinutes * 60 * 1000
      };
      localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      console.warn('Failed to store item in localStorage:', error);
    }
  }

  /**
   * Get data from localStorage with expiration check
   */
  static getItem<T>(key: string): T | null {
    try {
      const itemStr = localStorage.getItem(key);
      if (!itemStr) return null;

      const item = JSON.parse(itemStr);
      
      // Check expiration
      if (Date.now() - item.timestamp > item.ttl) {
        localStorage.removeItem(key);
        return null;
      }

      return item.data as T;
    } catch (error) {
      console.warn('Failed to retrieve item from localStorage:', error);
      return null;
    }
  }

  /**
   * Remove item from localStorage
   */
  static removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove item from localStorage:', error);
    }
  }

  /**
   * Clear expired items from localStorage
   */
  static cleanup(): void {
    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        try {
          const itemStr = localStorage.getItem(key);
          if (!itemStr) continue;

          const item = JSON.parse(itemStr);
          if (item.timestamp && item.ttl) {
            if (Date.now() - item.timestamp > item.ttl) {
              keysToRemove.push(key);
            }
          }
        } catch {
          // Invalid item format, remove it
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to cleanup localStorage:', error);
    }
  }
}

// Cleanup localStorage on app start
BrowserCache.cleanup();