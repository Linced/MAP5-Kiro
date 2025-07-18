import { v4 as uuidv4 } from 'uuid';
import { database, QueryHelpers } from '../database';
import { ParsedData, StorageResult, Upload, DataRow } from '../types';
import { MemoryManager, CSVMemoryManager } from '../utils/memoryManager';

export class DataStorageService {
  /**
   * Store parsed CSV data in the database with memory management
   */
  static async storeData(
    userId: number, 
    filename: string, 
    parsedData: ParsedData
  ): Promise<StorageResult> {
    const uploadId = uuidv4();
    const memoryManager = MemoryManager.getInstance();
    const csvMemoryManager = new CSVMemoryManager();
    
    // Validate CSV size before processing
    const sizeValidation = csvMemoryManager.validateCSVSize(parsedData.rows);
    if (!sizeValidation.canProcess) {
      throw new Error(`Cannot process CSV: ${sizeValidation.reason}`);
    }
    
    return memoryManager.monitorMemoryDuring(async () => {
      try {
        // Begin transaction for data consistency
        await database.run('BEGIN TRANSACTION');
        
        // Create upload metadata record
        const uploadRecord = {
          id: uploadId,
          user_id: userId,
          filename: filename,
          row_count: parsedData.rows.length,
          column_names: JSON.stringify(parsedData.headers)
        };
        
        await QueryHelpers.insert('uploads', uploadRecord);
        
        // Process data in memory-efficient chunks
        await csvMemoryManager.processCSVInChunks(
          parsedData.rows,
          async (chunk) => {
            // Prepare chunk for batch insert
            const dataRows = chunk.map((row, index) => ({
              user_id: userId,
              upload_id: uploadId,
              row_index: parsedData.rows.indexOf(row), // Get original index
              row_data: JSON.stringify(row)
            }));
            
            // Batch insert chunk
            if (dataRows.length > 0) {
              await QueryHelpers.batchInsert('data_rows', dataRows);
            }
            
            // Force garbage collection after each chunk
            memoryManager.forceGarbageCollection();
          },
          100 // Process in chunks of 100 rows
        );
        
        // Commit transaction
        await database.run('COMMIT');
        
        return {
          uploadId,
          rowCount: parsedData.rows.length
        };
        
      } catch (error) {
        // Rollback transaction on error
        await database.run('ROLLBACK');
        throw new Error(`Failed to store CSV data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }, `CSV data storage for ${filename}`);
  }
  
  /**
   * Get upload metadata by ID
   */
  static async getUploadMetadata(uploadId: string, userId?: number): Promise<Upload | null> {
    try {
      let query = 'SELECT * FROM uploads WHERE id = ?';
      const params: any[] = [uploadId];
      
      if (userId) {
        query += ' AND user_id = ?';
        params.push(userId);
      }
      
      const result = await database.get(query, params);
      
      if (!result) {
        return null;
      }
      
      return {
        id: result.id,
        userId: result.user_id,
        filename: result.filename,
        rowCount: result.row_count,
        columnNames: JSON.parse(result.column_names),
        uploadedAt: new Date(result.uploaded_at)
      };
      
    } catch (error) {
      throw new Error(`Failed to retrieve upload metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Get user's upload history
   */
  static async getUserUploads(userId: number, limit: number = 10): Promise<Upload[]> {
    try {
      const results = await database.all(
        `SELECT * FROM uploads 
         WHERE user_id = ? 
         ORDER BY uploaded_at DESC 
         LIMIT ?`,
        [userId, limit]
      );
      
      return results.map(result => ({
        id: result.id,
        userId: result.user_id,
        filename: result.filename,
        rowCount: result.row_count,
        columnNames: JSON.parse(result.column_names),
        uploadedAt: new Date(result.uploaded_at)
      }));
      
    } catch (error) {
      throw new Error(`Failed to retrieve user uploads: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Delete upload and all associated data
   */
  static async deleteUpload(uploadId: string, userId: number): Promise<boolean> {
    try {
      await database.run('BEGIN TRANSACTION');
      
      // Verify ownership
      const upload = await database.get(
        'SELECT id FROM uploads WHERE id = ? AND user_id = ?',
        [uploadId, userId]
      );
      
      if (!upload) {
        await database.run('ROLLBACK');
        return false;
      }
      
      // Delete data rows first (due to foreign key constraints)
      await database.run('DELETE FROM data_rows WHERE upload_id = ?', [uploadId]);
      
      // Delete calculated columns
      await database.run('DELETE FROM calculated_columns WHERE upload_id = ?', [uploadId]);
      
      // Delete upload metadata
      await database.run('DELETE FROM uploads WHERE id = ?', [uploadId]);
      
      await database.run('COMMIT');
      return true;
      
    } catch (error) {
      await database.run('ROLLBACK');
      throw new Error(`Failed to delete upload: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Get data rows with pagination and filtering
   */
  static async getDataRows(
    uploadId: string,
    userId: number,
    page: number = 1,
    limit: number = 100,
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Promise<{ rows: DataRow[], totalCount: number }> {
    try {
      // Verify upload ownership
      const upload = await this.getUploadMetadata(uploadId, userId);
      if (!upload) {
        throw new Error('Upload not found or access denied');
      }
      
      const offset = (page - 1) * limit;
      
      // Get total count
      const countResult = await database.get(
        'SELECT COUNT(*) as count FROM data_rows WHERE upload_id = ?',
        [uploadId]
      );
      const totalCount = countResult.count;
      
      // Build query with optional sorting
      let query = `
        SELECT id, user_id, upload_id, row_index, row_data, uploaded_at 
        FROM data_rows 
        WHERE upload_id = ?
      `;
      
      if (sortBy === 'row_index' || !sortBy) {
        query += ` ORDER BY row_index ${sortOrder.toUpperCase()}`;
      }
      
      query += ` LIMIT ? OFFSET ?`;
      
      const results = await database.all(query, [uploadId, limit, offset]);
      
      const rows: DataRow[] = results.map(result => ({
        id: result.id,
        userId: result.user_id,
        uploadId: result.upload_id,
        rowIndex: result.row_index,
        data: JSON.parse(result.row_data)
      }));
      
      return { rows, totalCount };
      
    } catch (error) {
      throw new Error(`Failed to retrieve data rows: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Get storage statistics for a user
   */
  static async getUserStorageStats(userId: number): Promise<{
    totalUploads: number;
    totalRows: number;
    lastUploadDate: Date | null;
  }> {
    try {
      const stats = await database.get(`
        SELECT 
          COUNT(*) as total_uploads,
          SUM(row_count) as total_rows,
          MAX(uploaded_at) as last_upload
        FROM uploads 
        WHERE user_id = ?
      `, [userId]);
      
      return {
        totalUploads: stats.total_uploads || 0,
        totalRows: stats.total_rows || 0,
        lastUploadDate: stats.last_upload ? new Date(stats.last_upload) : null
      };
      
    } catch (error) {
      throw new Error(`Failed to retrieve storage stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default DataStorageService;