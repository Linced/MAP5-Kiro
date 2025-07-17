import { database } from '../database';
import { Upload } from '../types';

export interface UploadProgress {
  uploadId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  message?: string;
  error?: string;
}

export interface UploadStats {
  totalUploads: number;
  successfulUploads: number;
  failedUploads: number;
  totalRowsProcessed: number;
  averageFileSize: number;
  lastUploadDate: Date | null;
}

export class UploadTrackingService {
  // In-memory tracking for upload progress (in production, consider Redis)
  private static progressMap = new Map<string, UploadProgress>();
  
  /**
   * Initialize upload tracking
   */
  static initializeUpload(uploadId: string): void {
    this.progressMap.set(uploadId, {
      uploadId,
      status: 'pending',
      progress: 0,
      message: 'Upload initialized'
    });
  }
  
  /**
   * Update upload progress
   */
  static updateProgress(
    uploadId: string, 
    progress: number, 
    status: UploadProgress['status'],
    message?: string
  ): void {
    const current = this.progressMap.get(uploadId);
    if (current) {
      this.progressMap.set(uploadId, {
        ...current,
        progress: Math.min(100, Math.max(0, progress)),
        status,
        message: message ?? current.message ?? ''
      });
    }
  }
  
  /**
   * Mark upload as failed
   */
  static markAsFailed(uploadId: string, error: string): void {
    const current = this.progressMap.get(uploadId);
    if (current) {
      this.progressMap.set(uploadId, {
        ...current,
        status: 'failed',
        progress: 0,
        error,
        message: 'Upload failed'
      });
    }
  }
  
  /**
   * Mark upload as completed
   */
  static markAsCompleted(uploadId: string, rowCount: number): void {
    const current = this.progressMap.get(uploadId);
    if (current) {
      this.progressMap.set(uploadId, {
        ...current,
        status: 'completed',
        progress: 100,
        message: `Successfully processed ${rowCount} rows`
      });
    }
  }
  
  /**
   * Get upload progress
   */
  static getProgress(uploadId: string): UploadProgress | null {
    return this.progressMap.get(uploadId) || null;
  }
  
  /**
   * Clean up completed or failed uploads from memory
   */
  static cleanup(uploadId: string): void {
    this.progressMap.delete(uploadId);
  }
  
  /**
   * Get comprehensive upload statistics for a user
   */
  static async getUserUploadStats(userId: number): Promise<UploadStats> {
    try {
      const stats = await database.get(`
        SELECT 
          COUNT(*) as total_uploads,
          SUM(row_count) as total_rows,
          AVG(row_count) as avg_rows,
          MAX(uploaded_at) as last_upload
        FROM uploads 
        WHERE user_id = ?
      `, [userId]);
      
      // For this MVP, we'll consider all stored uploads as successful
      // In a more complex system, we'd track failed uploads separately
      return {
        totalUploads: stats.total_uploads || 0,
        successfulUploads: stats.total_uploads || 0,
        failedUploads: 0, // Would be tracked separately in production
        totalRowsProcessed: stats.total_rows || 0,
        averageFileSize: stats.avg_rows || 0,
        lastUploadDate: stats.last_upload ? new Date(stats.last_upload) : null
      };
      
    } catch (error) {
      throw new Error(`Failed to retrieve upload stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Get recent upload activity for a user
   */
  static async getRecentActivity(userId: number, limit: number = 5): Promise<Upload[]> {
    try {
      const results = await database.all(`
        SELECT id, filename, row_count, uploaded_at, column_names
        FROM uploads 
        WHERE user_id = ? 
        ORDER BY uploaded_at DESC 
        LIMIT ?
      `, [userId, limit]);
      
      return results.map(result => ({
        id: result.id,
        userId: userId,
        filename: result.filename,
        rowCount: result.row_count,
        columnNames: JSON.parse(result.column_names),
        uploadedAt: new Date(result.uploaded_at)
      }));
      
    } catch (error) {
      throw new Error(`Failed to retrieve recent activity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Check if user has reached upload limits (for MVP, basic limits)
   */
  static async checkUploadLimits(userId: number): Promise<{
    canUpload: boolean;
    reason?: string;
    limits: {
      maxUploadsPerDay: number;
      maxTotalRows: number;
      currentUploadsToday: number;
      currentTotalRows: number;
    }
  }> {
    try {
      // Define MVP limits
      const MAX_UPLOADS_PER_DAY = 10;
      const MAX_TOTAL_ROWS = 10000;
      
      // Get today's uploads
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayStats = await database.get(`
        SELECT 
          COUNT(*) as uploads_today,
          COALESCE(SUM(row_count), 0) as rows_today
        FROM uploads 
        WHERE user_id = ? AND uploaded_at >= ?
      `, [userId, today.toISOString()]);
      
      // Get total rows across all uploads
      const totalStats = await database.get(`
        SELECT COALESCE(SUM(row_count), 0) as total_rows
        FROM uploads 
        WHERE user_id = ?
      `, [userId]);
      
      const currentUploadsToday = todayStats.uploads_today || 0;
      const currentTotalRows = totalStats.total_rows || 0;
      
      let canUpload = true;
      let reason: string | undefined;
      
      if (currentUploadsToday >= MAX_UPLOADS_PER_DAY) {
        canUpload = false;
        reason = `Daily upload limit of ${MAX_UPLOADS_PER_DAY} files reached`;
      } else if (currentTotalRows >= MAX_TOTAL_ROWS) {
        canUpload = false;
        reason = `Total row limit of ${MAX_TOTAL_ROWS} rows reached`;
      }
      
      const result: {
        canUpload: boolean;
        reason?: string;
        limits: {
          maxUploadsPerDay: number;
          maxTotalRows: number;
          currentUploadsToday: number;
          currentTotalRows: number;
        }
      } = {
        canUpload,
        limits: {
          maxUploadsPerDay: MAX_UPLOADS_PER_DAY,
          maxTotalRows: MAX_TOTAL_ROWS,
          currentUploadsToday,
          currentTotalRows
        }
      };
      
      if (reason) {
        result.reason = reason;
      }
      
      return result;
      
    } catch (error) {
      throw new Error(`Failed to check upload limits: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default UploadTrackingService;