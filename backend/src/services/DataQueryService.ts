import { database, createQueryBuilder, QueryHelpers } from '../database';
import { QueryOptions, Filter, DataResult, ColumnInfo, DataRow, Upload } from '../types';

export class DataQueryService {
  /**
   * Get user's data with pagination, sorting, and filtering
   * Optimized with better query patterns and caching
   */
  static async getUserData(userId: number, options: QueryOptions): Promise<DataResult> {
    try {
      // Use optimized query with proper indexes
      let baseQuery = `
        SELECT 
          dr.id,
          dr.user_id,
          dr.upload_id,
          dr.row_index,
          dr.row_data,
          dr.uploaded_at,
          u.filename,
          u.column_names
        FROM data_rows dr 
        INNER JOIN uploads u ON dr.upload_id = u.id 
        WHERE dr.user_id = ?
      `;
      
      const params: any[] = [userId];

      // Apply filters with optimized WHERE clauses
      if (options.filters && options.filters.length > 0) {
        const filterClauses = this.buildOptimizedFilters(options.filters);
        if (filterClauses.clauses.length > 0) {
          baseQuery += ' AND ' + filterClauses.clauses.join(' AND ');
          params.push(...filterClauses.params);
        }
      }

      // Apply sorting with index-friendly ORDER BY
      if (options.sortBy) {
        if (options.sortBy === 'uploaded_at') {
          baseQuery += ` ORDER BY dr.uploaded_at ${options.sortOrder?.toUpperCase() || 'DESC'}`;
        } else if (options.sortBy === 'filename') {
          baseQuery += ` ORDER BY u.filename ${options.sortOrder?.toUpperCase() || 'ASC'}`;
        } else {
          baseQuery += ` ORDER BY dr.row_index ${options.sortOrder?.toUpperCase() || 'ASC'}`;
        }
      } else {
        baseQuery += ' ORDER BY dr.uploaded_at DESC, dr.row_index ASC';
      }

      // Apply pagination
      const offset = (options.page - 1) * options.limit;
      baseQuery += ` LIMIT ? OFFSET ?`;
      params.push(options.limit, offset);

      // Execute optimized query
      const results = await database.all(baseQuery, params);

      // Get total count with same filters (optimized)
      const totalCount = await this.getOptimizedTotalCount(userId, options.filters);

      // Transform results with minimal processing
      const data: DataRow[] = results.map(result => ({
        id: result.id,
        userId: result.user_id,
        uploadId: result.upload_id,
        rowIndex: result.row_index,
        data: JSON.parse(result.row_data)
      }));

      return {
        data,
        totalCount,
        page: options.page,
        limit: options.limit
      };

    } catch (error) {
      throw new Error(`Failed to retrieve user data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get data for a specific upload with advanced filtering and sorting
   */
  static async getUploadData(
    userId: number, 
    uploadId: string, 
    options: QueryOptions
  ): Promise<DataResult> {
    try {
      // Verify upload ownership
      const upload = await this.getUploadMetadata(uploadId, userId);
      if (!upload) {
        throw new Error('Upload not found or access denied');
      }

      const queryBuilder = createQueryBuilder()
        .select(['id', 'user_id', 'upload_id', 'row_index', 'row_data', 'uploaded_at'])
        .from('data_rows')
        .where('upload_id = ? AND user_id = ?', uploadId, userId);

      // Apply column-based filters
      if (options.filters && options.filters.length > 0) {
        await this.applyColumnFilters(queryBuilder, options.filters, upload.columnNames);
      }

      // Apply sorting - handle both row_index and column-based sorting
      if (options.sortBy) {
        if (options.sortBy === 'row_index') {
          queryBuilder.orderBy('row_index', options.sortOrder?.toUpperCase() as 'ASC' | 'DESC' || 'ASC');
        } else if (upload.columnNames.includes(options.sortBy)) {
          // For column-based sorting, we need to extract from JSON
          const direction = options.sortOrder?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
          queryBuilder.orderBy(`JSON_EXTRACT(row_data, '$.${options.sortBy}')`, direction as 'ASC' | 'DESC');
        }
      } else {
        queryBuilder.orderBy('row_index', 'ASC');
      }

      // Apply pagination
      const offset = (options.page - 1) * options.limit;
      queryBuilder.limit(options.limit).offset(offset);

      const results = await queryBuilder.execute();

      // Get total count
      const totalCount = await this.getUploadTotalCount(uploadId, options.filters, upload.columnNames);

      // Transform results
      const data: DataRow[] = results.map(result => ({
        id: result.id,
        userId: result.user_id,
        uploadId: result.upload_id,
        rowIndex: result.row_index,
        data: JSON.parse(result.row_data)
      }));

      return {
        data,
        totalCount,
        page: options.page,
        limit: options.limit
      };

    } catch (error) {
      throw new Error(`Failed to retrieve upload data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get column information for dynamic table headers
   */
  static async getColumnInfo(userId: number, uploadId?: string): Promise<ColumnInfo[]> {
    try {
      let uploads: Upload[];

      if (uploadId) {
        // Get specific upload
        const upload = await this.getUploadMetadata(uploadId, userId);
        uploads = upload ? [upload] : [];
      } else {
        // Get all user uploads
        uploads = await this.getUserUploads(userId);
      }

      if (uploads.length === 0) {
        return [];
      }

      // Collect all unique columns across uploads
      const columnSet = new Set<string>();
      const columnTypes: Record<string, string> = {};

      for (const upload of uploads) {
        for (const columnName of upload.columnNames) {
          columnSet.add(columnName);
          
          // Determine column type by sampling data
          if (!columnTypes[columnName]) {
            const sampleType = await this.inferColumnType(upload.id, columnName);
            columnTypes[columnName] = sampleType;
          }
        }
      }

      // Convert to ColumnInfo array
      const columnInfo: ColumnInfo[] = Array.from(columnSet).map(name => ({
        name,
        type: columnTypes[name] || 'text',
        nullable: true // CSV data is generally nullable
      }));

      return columnInfo.sort((a, b) => a.name.localeCompare(b.name));

    } catch (error) {
      throw new Error(`Failed to retrieve column info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get calculated columns for a user or specific upload
   */
  static async getCalculatedColumns(userId: number, uploadId?: string) {
    try {
      let query = 'SELECT * FROM calculated_columns WHERE user_id = ?';
      const params: any[] = [userId];

      if (uploadId) {
        query += ' AND upload_id = ?';
        params.push(uploadId);
      }

      query += ' ORDER BY created_at DESC';

      const results = await database.all(query, params);

      return results.map(result => ({
        id: result.id,
        userId: result.user_id,
        uploadId: result.upload_id,
        columnName: result.column_name,
        formula: result.formula,
        createdAt: new Date(result.created_at)
      }));

    } catch (error) {
      throw new Error(`Failed to retrieve calculated columns: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Apply filters to data query (for JSON column filtering)
   */
  private static async applyColumnFilters(
    queryBuilder: any, 
    filters: Filter[], 
    availableColumns: string[]
  ): Promise<void> {
    for (const filter of filters) {
      // Only apply filters for columns that exist in the upload
      if (!availableColumns.includes(filter.column)) {
        continue;
      }

      const jsonPath = `$.${filter.column}`;
      
      switch (filter.operator) {
        case 'eq':
          queryBuilder.where(`JSON_EXTRACT(row_data, ?) = ?`, jsonPath, filter.value);
          break;
        case 'gt':
          queryBuilder.where(`CAST(JSON_EXTRACT(row_data, ?) AS REAL) > ?`, jsonPath, filter.value);
          break;
        case 'lt':
          queryBuilder.where(`CAST(JSON_EXTRACT(row_data, ?) AS REAL) < ?`, jsonPath, filter.value);
          break;
        case 'contains':
          queryBuilder.where(`JSON_EXTRACT(row_data, ?) LIKE ?`, jsonPath, `%${filter.value}%`);
          break;
      }
    }
  }

  /**
   * Apply general data filters (for cross-upload queries)
   */
  private static async applyDataFilters(queryBuilder: any, filters: Filter[]): Promise<void> {
    for (const filter of filters) {
      // Handle special system columns
      if (filter.column === 'filename') {
        switch (filter.operator) {
          case 'eq':
            queryBuilder.where('u.filename = ?', filter.value);
            break;
          case 'contains':
            queryBuilder.where('u.filename LIKE ?', `%${filter.value}%`);
            break;
        }
      } else if (filter.column === 'uploaded_at') {
        switch (filter.operator) {
          case 'gt':
            queryBuilder.where('dr.uploaded_at > ?', filter.value);
            break;
          case 'lt':
            queryBuilder.where('dr.uploaded_at < ?', filter.value);
            break;
        }
      }
      // For data column filters, we'd need to know which uploads contain which columns
      // This is more complex and might require a separate query strategy
    }
  }

  /**
   * Build optimized filter clauses for better query performance
   */
  private static buildOptimizedFilters(filters: Filter[]): { clauses: string[], params: any[] } {
    const clauses: string[] = [];
    const params: any[] = [];

    for (const filter of filters) {
      if (filter.column === 'filename') {
        if (filter.operator === 'eq') {
          clauses.push('u.filename = ?');
          params.push(filter.value);
        } else if (filter.operator === 'contains') {
          clauses.push('u.filename LIKE ?');
          params.push(`%${filter.value}%`);
        }
      } else if (filter.column === 'uploaded_at') {
        if (filter.operator === 'gt') {
          clauses.push('dr.uploaded_at > ?');
          params.push(filter.value);
        } else if (filter.operator === 'lt') {
          clauses.push('dr.uploaded_at < ?');
          params.push(filter.value);
        }
      }
    }

    return { clauses, params };
  }

  /**
   * Get optimized total count for pagination with better performance
   */
  private static async getOptimizedTotalCount(userId: number, filters?: Filter[]): Promise<number> {
    try {
      let query = `
        SELECT COUNT(*) as count 
        FROM data_rows dr 
        INNER JOIN uploads u ON dr.upload_id = u.id 
        WHERE dr.user_id = ?
      `;
      const params: any[] = [userId];

      // Apply same filters as main query for accurate count
      if (filters && filters.length > 0) {
        const filterClauses = this.buildOptimizedFilters(filters);
        if (filterClauses.clauses.length > 0) {
          query += ' AND ' + filterClauses.clauses.join(' AND ');
          params.push(...filterClauses.params);
        }
      }

      const result = await database.get(query, params);
      return result?.count || 0;

    } catch (error) {
      throw new Error(`Failed to get optimized total count: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get total count for pagination
   */
  private static async getTotalCount(userId: number, filters?: Filter[]): Promise<number> {
    try {
      let query = 'SELECT COUNT(*) as count FROM data_rows dr LEFT JOIN uploads u ON dr.upload_id = u.id WHERE dr.user_id = ?';
      const params: any[] = [userId];

      // Apply same filters as main query for accurate count
      if (filters && filters.length > 0) {
        for (const filter of filters) {
          if (filter.column === 'filename') {
            if (filter.operator === 'eq') {
              query += ' AND u.filename = ?';
              params.push(filter.value);
            } else if (filter.operator === 'contains') {
              query += ' AND u.filename LIKE ?';
              params.push(`%${filter.value}%`);
            }
          }
        }
      }

      const result = await database.get(query, params);
      return result?.count || 0;

    } catch (error) {
      throw new Error(`Failed to get total count: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get total count for specific upload with filters
   */
  private static async getUploadTotalCount(
    uploadId: string, 
    filters?: Filter[], 
    availableColumns?: string[]
  ): Promise<number> {
    try {
      let query = 'SELECT COUNT(*) as count FROM data_rows WHERE upload_id = ?';
      const params: any[] = [uploadId];

      // Apply column filters to count query
      if (filters && filters.length > 0 && availableColumns) {
        for (const filter of filters) {
          if (!availableColumns.includes(filter.column)) continue;

          const jsonPath = `$.${filter.column}`;
          
          switch (filter.operator) {
            case 'eq':
              query += ' AND JSON_EXTRACT(row_data, ?) = ?';
              params.push(jsonPath, filter.value);
              break;
            case 'gt':
              query += ' AND CAST(JSON_EXTRACT(row_data, ?) AS REAL) > ?';
              params.push(jsonPath, filter.value);
              break;
            case 'lt':
              query += ' AND CAST(JSON_EXTRACT(row_data, ?) AS REAL) < ?';
              params.push(jsonPath, filter.value);
              break;
            case 'contains':
              query += ' AND JSON_EXTRACT(row_data, ?) LIKE ?';
              params.push(jsonPath, `%${filter.value}%`);
              break;
          }
        }
      }

      const result = await database.get(query, params);
      return result?.count || 0;

    } catch (error) {
      throw new Error(`Failed to get upload total count: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Infer column type by sampling data
   */
  private static async inferColumnType(uploadId: string, columnName: string): Promise<string> {
    try {
      // Sample a few rows to determine type
      const samples = await database.all(
        `SELECT JSON_EXTRACT(row_data, ?) as value 
         FROM data_rows 
         WHERE upload_id = ? AND JSON_EXTRACT(row_data, ?) IS NOT NULL 
         LIMIT 10`,
        [`$.${columnName}`, uploadId, `$.${columnName}`]
      );

      if (samples.length === 0) return 'text';

      // Analyze sample values
      let numericCount = 0;
      let dateCount = 0;

      for (const sample of samples) {
        const value = sample.value;
        
        // Check if numeric
        if (!isNaN(Number(value)) && value !== '') {
          numericCount++;
        }
        
        // Check if date-like
        if (typeof value === 'string' && !isNaN(Date.parse(value))) {
          dateCount++;
        }
      }

      // Determine type based on majority
      const total = samples.length;
      if (numericCount / total > 0.8) return 'number';
      if (dateCount / total > 0.8) return 'date';
      
      return 'text';

    } catch (error) {
      return 'text'; // Default to text on error
    }
  }

  /**
   * Helper method to get upload metadata
   */
  private static async getUploadMetadata(uploadId: string, userId?: number): Promise<Upload | null> {
    try {
      let query = 'SELECT * FROM uploads WHERE id = ?';
      const params: any[] = [uploadId];
      
      if (userId) {
        query += ' AND user_id = ?';
        params.push(userId);
      }
      
      const result = await database.get(query, params);
      
      if (!result) return null;
      
      return {
        id: result.id,
        userId: result.user_id,
        filename: result.filename,
        rowCount: result.row_count,
        columnNames: JSON.parse(result.column_names),
        uploadedAt: new Date(result.uploaded_at)
      };
      
    } catch (error) {
      return null;
    }
  }

  /**
   * Helper method to get user uploads
   */
  private static async getUserUploads(userId: number): Promise<Upload[]> {
    try {
      const results = await database.all(
        'SELECT * FROM uploads WHERE user_id = ? ORDER BY uploaded_at DESC',
        [userId]
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
      return [];
    }
  }

  /**
   * Transform data for frontend consumption
   */
  static transformDataForFrontend(data: DataRow[]): any[] {
    return data.map(row => ({
      id: row.id,
      uploadId: row.uploadId,
      rowIndex: row.rowIndex,
      ...row.data // Spread the actual data columns
    }));
  }

  /**
   * Get aggregated statistics for dashboard
   */
  static async getDashboardStats(userId: number): Promise<{
    totalRows: number;
    totalUploads: number;
    lastUploadDate: Date | null;
    uniqueColumns: number;
  }> {
    try {
      // Get basic stats
      const basicStats = await database.get(`
        SELECT 
          COUNT(DISTINCT dr.upload_id) as total_uploads,
          COUNT(dr.id) as total_rows,
          MAX(dr.uploaded_at) as last_upload
        FROM data_rows dr
        WHERE dr.user_id = ?
      `, [userId]);

      // Get unique column count
      const uploads = await this.getUserUploads(userId);
      const uniqueColumns = new Set<string>();
      
      uploads.forEach(upload => {
        upload.columnNames.forEach(col => uniqueColumns.add(col));
      });

      return {
        totalRows: basicStats?.total_rows || 0,
        totalUploads: basicStats?.total_uploads || 0,
        lastUploadDate: basicStats?.last_upload ? new Date(basicStats.last_upload) : null,
        uniqueColumns: uniqueColumns.size
      };

    } catch (error) {
      throw new Error(`Failed to get dashboard stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default DataQueryService;