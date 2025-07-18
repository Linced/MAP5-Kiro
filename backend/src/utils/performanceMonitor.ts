/**
 * Performance monitoring utilities for tracking optimization effectiveness
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface QueryPerformance {
  query: string;
  duration: number;
  rowsAffected?: number;
  timestamp: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private queryMetrics: QueryPerformance[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata
    };

    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Record query performance
   */
  recordQuery(query: string, duration: number, rowsAffected?: number): void {
    const queryMetric: QueryPerformance = {
      query: query.substring(0, 100), // Truncate long queries
      duration,
      rowsAffected,
      timestamp: Date.now()
    };

    this.queryMetrics.push(queryMetric);

    // Keep only recent query metrics
    if (this.queryMetrics.length > this.maxMetrics) {
      this.queryMetrics = this.queryMetrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Time an operation and record the metric
   */
  async timeOperation<T>(
    name: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      
      this.recordMetric(name, duration, {
        ...metadata,
        success: true
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.recordMetric(name, duration, {
        ...metadata,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }

  /**
   * Get performance statistics
   */
  getStats(metricName?: string): {
    count: number;
    average: number;
    min: number;
    max: number;
    recent: number; // Last 10 average
  } {
    const filteredMetrics = metricName 
      ? this.metrics.filter(m => m.name === metricName)
      : this.metrics;

    if (filteredMetrics.length === 0) {
      return { count: 0, average: 0, min: 0, max: 0, recent: 0 };
    }

    const values = filteredMetrics.map(m => m.value);
    const recentValues = values.slice(-10);

    return {
      count: filteredMetrics.length,
      average: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      recent: recentValues.reduce((a, b) => a + b, 0) / recentValues.length
    };
  }

  /**
   * Get query performance statistics
   */
  getQueryStats(): {
    totalQueries: number;
    averageDuration: number;
    slowQueries: QueryPerformance[];
  } {
    if (this.queryMetrics.length === 0) {
      return { totalQueries: 0, averageDuration: 0, slowQueries: [] };
    }

    const durations = this.queryMetrics.map(q => q.duration);
    const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    
    // Queries taking more than 2x average are considered slow
    const slowThreshold = averageDuration * 2;
    const slowQueries = this.queryMetrics
      .filter(q => q.duration > slowThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10); // Top 10 slowest

    return {
      totalQueries: this.queryMetrics.length,
      averageDuration,
      slowQueries
    };
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): {
    metrics: Record<string, any>;
    queries: any;
    memory: any;
  } {
    const uniqueMetricNames = [...new Set(this.metrics.map(m => m.name))];
    const metricStats: Record<string, any> = {};
    
    uniqueMetricNames.forEach(name => {
      metricStats[name] = this.getStats(name);
    });

    return {
      metrics: metricStats,
      queries: this.getQueryStats(),
      memory: process.memoryUsage()
    };
  }

  /**
   * Clear old metrics
   */
  cleanup(): void {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    this.queryMetrics = this.queryMetrics.filter(q => q.timestamp > cutoff);
  }
}

/**
 * Database query performance wrapper
 */
export function withQueryPerformance<T extends any[], R>(
  queryFunction: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const monitor = PerformanceMonitor.getInstance();
    const startTime = performance.now();
    
    try {
      const result = await queryFunction(...args);
      const duration = performance.now() - startTime;
      
      // Extract query string from arguments if available
      const queryString = args.find(arg => typeof arg === 'string' && arg.includes('SELECT')) as string || 'Unknown query';
      
      monitor.recordQuery(queryString, duration);
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      const queryString = args.find(arg => typeof arg === 'string' && arg.includes('SELECT')) as string || 'Unknown query';
      
      monitor.recordQuery(`ERROR: ${queryString}`, duration);
      throw error;
    }
  };
}

export default PerformanceMonitor;