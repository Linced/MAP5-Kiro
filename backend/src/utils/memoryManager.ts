/**
 * Memory management utilities for large file processing
 */

import { Readable } from 'stream';

interface MemoryUsage {
  rss: number;      // Resident Set Size
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
}

interface ProcessingOptions {
  chunkSize?: number;
  maxMemoryUsage?: number; // in MB
  gcThreshold?: number;    // in MB
}

export class MemoryManager {
  private static instance: MemoryManager;
  private maxMemoryUsage: number;
  private gcThreshold: number;
  private processingQueue: Map<string, any> = new Map();

  private constructor() {
    this.maxMemoryUsage = 512; // 512MB default
    this.gcThreshold = 256;    // 256MB default
  }

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * Get current memory usage
   */
  getMemoryUsage(): MemoryUsage {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024),
      arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024)
    };
  }

  /**
   * Check if memory usage is within limits
   */
  isMemoryWithinLimits(): boolean {
    const usage = this.getMemoryUsage();
    return usage.heapUsed < this.maxMemoryUsage;
  }

  /**
   * Force garbage collection if available and needed
   */
  forceGarbageCollection(): void {
    const usage = this.getMemoryUsage();
    
    if (usage.heapUsed > this.gcThreshold) {
      if (global.gc) {
        global.gc();
        console.log(`Garbage collection triggered. Memory before: ${usage.heapUsed}MB, after: ${this.getMemoryUsage().heapUsed}MB`);
      } else {
        console.warn('Garbage collection not available. Run with --expose-gc flag.');
      }
    }
  }

  /**
   * Process large data in chunks to manage memory
   */
  async processInChunks<T, R>(
    data: T[],
    processor: (chunk: T[]) => Promise<R[]>,
    options: ProcessingOptions = {}
  ): Promise<R[]> {
    const chunkSize = options.chunkSize || 100;
    const results: R[] = [];
    
    for (let i = 0; i < data.length; i += chunkSize) {
      // Check memory before processing chunk
      if (!this.isMemoryWithinLimits()) {
        this.forceGarbageCollection();
        
        // Wait a bit for GC to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!this.isMemoryWithinLimits()) {
          throw new Error('Memory limit exceeded during processing');
        }
      }

      const chunk = data.slice(i, i + chunkSize);
      const chunkResults = await processor(chunk);
      results.push(...chunkResults);

      // Clear chunk reference to help GC
      chunk.length = 0;
    }

    return results;
  }

  /**
   * Create a memory-efficient stream processor
   */
  createStreamProcessor<T>(
    processor: (data: T) => Promise<void>,
    options: ProcessingOptions = {}
  ): Readable {
    const stream = new Readable({
      objectMode: true,
      highWaterMark: options.chunkSize || 16
    });

    let processing = false;

    stream._read = () => {
      if (!processing) {
        processing = true;
        
        // Check memory usage
        if (!this.isMemoryWithinLimits()) {
          this.forceGarbageCollection();
        }
        
        processing = false;
      }
    };

    return stream;
  }

  /**
   * Monitor memory usage during operation
   */
  async monitorMemoryDuring<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const startUsage = this.getMemoryUsage();
    console.log(`Starting ${operationName}. Initial memory: ${startUsage.heapUsed}MB`);

    try {
      const result = await operation();
      
      const endUsage = this.getMemoryUsage();
      const memoryDiff = endUsage.heapUsed - startUsage.heapUsed;
      
      console.log(`Completed ${operationName}. Final memory: ${endUsage.heapUsed}MB (${memoryDiff > 0 ? '+' : ''}${memoryDiff}MB)`);
      
      return result;
    } catch (error) {
      const errorUsage = this.getMemoryUsage();
      console.error(`Error in ${operationName}. Memory at error: ${errorUsage.heapUsed}MB`);
      throw error;
    }
  }

  /**
   * Set memory limits
   */
  setMemoryLimits(maxUsage: number, gcThreshold?: number): void {
    this.maxMemoryUsage = maxUsage;
    this.gcThreshold = gcThreshold || maxUsage * 0.8;
  }

  /**
   * Clean up processing queue
   */
  cleanupProcessingQueue(): void {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    for (const [key, value] of this.processingQueue.entries()) {
      if (now - value.timestamp > maxAge) {
        this.processingQueue.delete(key);
      }
    }
  }

  /**
   * Add operation to processing queue for tracking
   */
  addToProcessingQueue(operationId: string, metadata: any): void {
    this.processingQueue.set(operationId, {
      ...metadata,
      timestamp: Date.now()
    });
  }

  /**
   * Remove operation from processing queue
   */
  removeFromProcessingQueue(operationId: string): void {
    this.processingQueue.delete(operationId);
  }

  /**
   * Get processing queue status
   */
  getProcessingQueueStatus(): {
    activeOperations: number;
    operations: Array<{ id: string; metadata: any; age: number }>
  } {
    const now = Date.now();
    const operations = Array.from(this.processingQueue.entries()).map(([id, data]) => ({
      id,
      metadata: data,
      age: now - data.timestamp
    }));

    return {
      activeOperations: this.processingQueue.size,
      operations
    };
  }
}

/**
 * Memory-efficient CSV processing utilities
 */
export class CSVMemoryManager {
  private memoryManager: MemoryManager;

  constructor() {
    this.memoryManager = MemoryManager.getInstance();
  }

  /**
   * Process CSV data in memory-efficient chunks
   */
  async processCSVInChunks(
    csvData: any[],
    processor: (rows: any[]) => Promise<void>,
    chunkSize: number = 100
  ): Promise<void> {
    const operationId = `csv-processing-${Date.now()}`;
    
    this.memoryManager.addToProcessingQueue(operationId, {
      type: 'csv_processing',
      totalRows: csvData.length,
      chunkSize
    });

    try {
      await this.memoryManager.processInChunks(
        csvData,
        async (chunk) => {
          await processor(chunk);
          return []; // Return empty array since we're not accumulating results
        },
        { chunkSize }
      );
    } finally {
      this.memoryManager.removeFromProcessingQueue(operationId);
    }
  }

  /**
   * Validate CSV data size before processing
   */
  validateCSVSize(csvData: any[]): { canProcess: boolean; reason?: string } {
    const estimatedMemoryUsage = this.estimateCSVMemoryUsage(csvData);
    const currentUsage = this.memoryManager.getMemoryUsage();
    
    if (estimatedMemoryUsage + currentUsage.heapUsed > this.memoryManager['maxMemoryUsage']) {
      return {
        canProcess: false,
        reason: `Estimated memory usage (${estimatedMemoryUsage}MB) would exceed limits`
      };
    }

    return { canProcess: true };
  }

  /**
   * Estimate memory usage for CSV data
   */
  private estimateCSVMemoryUsage(csvData: any[]): number {
    if (csvData.length === 0) return 0;

    // Sample first few rows to estimate average row size
    const sampleSize = Math.min(10, csvData.length);
    let totalSize = 0;

    for (let i = 0; i < sampleSize; i++) {
      const rowString = JSON.stringify(csvData[i]);
      totalSize += rowString.length * 2; // Rough estimate for UTF-16 encoding
    }

    const averageRowSize = totalSize / sampleSize;
    const estimatedTotalSize = (averageRowSize * csvData.length) / (1024 * 1024); // Convert to MB

    // Add overhead for processing (roughly 2x)
    return Math.ceil(estimatedTotalSize * 2);
  }
}

export default MemoryManager;