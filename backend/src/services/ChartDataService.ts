import { database } from '../database';
import { DataQueryService } from './DataQueryService';
import { Filter, ColumnInfo } from '../types';

export interface ChartDataPoint {
  x: any;
  y: number;
  label?: string;
}

export interface ChartDataset {
  label: string;
  data: ChartDataPoint[];
  backgroundColor?: string | undefined;
  borderColor?: string | undefined;
  borderWidth?: number | undefined;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartOptions {
  uploadId?: string;
  xColumn: string;
  yColumn: string;
  chartType: 'line' | 'bar';
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  groupBy?: string;
  limit?: number;
  filters?: Filter[];
}

export interface ChartValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export class ChartDataService {
  /**
   * Generate chart data formatted for Chart.js
   */
  static async generateChartData(userId: number, options: ChartOptions): Promise<ChartData> {
    try {
      // Validate chart options
      const validation = await this.validateChartOptions(userId, options);
      if (!validation.isValid) {
        throw new Error(`Chart validation failed: ${validation.errors.join(', ')}`);
      }

      // Get raw data based on options
      const rawData = await this.getRawChartData(userId, options);

      // Apply aggregation if specified
      const aggregatedData = options.aggregation 
        ? await this.aggregateData(rawData, options)
        : rawData;

      // Format for Chart.js
      const chartData = this.formatForChartJs(aggregatedData, options);

      return chartData;

    } catch (error) {
      throw new Error(`Failed to generate chart data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get optimized chart data with performance considerations
   */
  static async getOptimizedChartData(userId: number, options: ChartOptions): Promise<ChartData> {
    try {
      // Apply automatic optimization based on data size
      const optimizedOptions = await this.optimizeChartOptions(userId, options);
      
      return await this.generateChartData(userId, optimizedOptions);

    } catch (error) {
      throw new Error(`Failed to get optimized chart data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate chart options and data requirements
   */
  static async validateChartOptions(userId: number, options: ChartOptions): Promise<ChartValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check required fields
      if (!options.xColumn) {
        errors.push('X-axis column is required');
      }
      if (!options.yColumn) {
        errors.push('Y-axis column is required');
      }
      if (!options.chartType) {
        errors.push('Chart type is required');
      }

      // Validate chart type
      if (options.chartType && !['line', 'bar'].includes(options.chartType)) {
        errors.push('Chart type must be either "line" or "bar"');
      }

      // Get available columns
      const columnInfo = await DataQueryService.getColumnInfo(userId, options.uploadId);
      const availableColumns = columnInfo.map(col => col.name);

      // Check if specified columns exist
      if (options.xColumn && !availableColumns.includes(options.xColumn)) {
        errors.push(`X-axis column "${options.xColumn}" does not exist`);
      }
      if (options.yColumn && !availableColumns.includes(options.yColumn)) {
        errors.push(`Y-axis column "${options.yColumn}" does not exist`);
      }
      if (options.groupBy && !availableColumns.includes(options.groupBy)) {
        errors.push(`Group by column "${options.groupBy}" does not exist`);
      }

      // Validate column types
      const yColumnInfo = columnInfo.find(col => col.name === options.yColumn);

      if (yColumnInfo && yColumnInfo.type !== 'number') {
        warnings.push(`Y-axis column "${options.yColumn}" is not numeric, values will be converted`);
      }

      // Validate aggregation
      if (options.aggregation && !['sum', 'avg', 'count', 'min', 'max'].includes(options.aggregation)) {
        errors.push('Aggregation must be one of: sum, avg, count, min, max');
      }

      // Check data availability
      if (errors.length === 0) {
        const dataCount = await this.getDataCount(userId, options);
        if (dataCount === 0) {
          errors.push('No data available for the specified criteria');
        } else if (dataCount > 10000) {
          warnings.push(`Large dataset (${dataCount} rows) may impact performance. Consider using filters or aggregation.`);
        }
      }

      const result: ChartValidationResult = {
        isValid: errors.length === 0,
        errors
      };
      
      if (warnings.length > 0) {
        result.warnings = warnings;
      }
      
      return result;

    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Get raw data for chart generation
   */
  private static async getRawChartData(userId: number, options: ChartOptions): Promise<any[]> {
    try {
      let query: string;
      let params: any[];

      if (options.uploadId) {
        // Query specific upload
        query = `
          SELECT 
            JSON_EXTRACT(row_data, ?) as x_value,
            JSON_EXTRACT(row_data, ?) as y_value
            ${options.groupBy ? `, JSON_EXTRACT(row_data, ?) as group_value` : ''}
          FROM data_rows 
          WHERE user_id = ? AND upload_id = ?
        `;
        params = [
          `$.${options.xColumn}`,
          `$.${options.yColumn}`,
          ...(options.groupBy ? [`$.${options.groupBy}`] : []),
          userId,
          options.uploadId
        ];
      } else {
        // Query all user data
        query = `
          SELECT 
            JSON_EXTRACT(dr.row_data, ?) as x_value,
            JSON_EXTRACT(dr.row_data, ?) as y_value
            ${options.groupBy ? `, JSON_EXTRACT(dr.row_data, ?) as group_value` : ''}
          FROM data_rows dr
          WHERE dr.user_id = ?
        `;
        params = [
          `$.${options.xColumn}`,
          `$.${options.yColumn}`,
          ...(options.groupBy ? [`$.${options.groupBy}`] : []),
          userId
        ];
      }

      // Apply filters
      if (options.filters && options.filters.length > 0) {
        for (const filter of options.filters) {
          const jsonPath = `$.${filter.column}`;
          switch (filter.operator) {
            case 'eq':
              query += ` AND JSON_EXTRACT(${options.uploadId ? 'row_data' : 'dr.row_data'}, ?) = ?`;
              params.push(jsonPath, filter.value);
              break;
            case 'gt':
              query += ` AND CAST(JSON_EXTRACT(${options.uploadId ? 'row_data' : 'dr.row_data'}, ?) AS REAL) > ?`;
              params.push(jsonPath, filter.value);
              break;
            case 'lt':
              query += ` AND CAST(JSON_EXTRACT(${options.uploadId ? 'row_data' : 'dr.row_data'}, ?) AS REAL) < ?`;
              params.push(jsonPath, filter.value);
              break;
            case 'contains':
              query += ` AND JSON_EXTRACT(${options.uploadId ? 'row_data' : 'dr.row_data'}, ?) LIKE ?`;
              params.push(jsonPath, `%${filter.value}%`);
              break;
          }
        }
      }

      // Add ordering for line charts (typically by x-axis)
      if (options.chartType === 'line') {
        query += ` ORDER BY x_value`;
      }

      // Apply limit for performance
      const limit = options.limit || 1000;
      query += ` LIMIT ?`;
      params.push(limit);

      const results = await database.all(query, params);

      // Filter out null values and convert types
      return results
        .filter(row => row.x_value !== null && row.y_value !== null)
        .map(row => ({
          x: row.x_value,
          y: this.convertToNumber(row.y_value),
          group: row.group_value || null
        }))
        .filter(row => !isNaN(row.y)); // Remove invalid numbers

    } catch (error) {
      throw new Error(`Failed to get raw chart data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Apply data aggregation for chart optimization
   */
  private static async aggregateData(data: any[], options: ChartOptions): Promise<any[]> {
    if (!options.aggregation) return data;

    try {
      const grouped = new Map<string, any[]>();

      // Group data by x-value (and optionally by group)
      for (const item of data) {
        const key = options.groupBy 
          ? `${item.x}_${item.group}` 
          : String(item.x);
        
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key)!.push(item);
      }

      // Apply aggregation function
      const aggregated: any[] = [];
      
      for (const [, items] of grouped.entries()) {
        const xValue = items[0].x;
        const groupValue = items[0].group;
        let yValue: number;

        switch (options.aggregation) {
          case 'sum':
            yValue = items.reduce((sum, item) => sum + item.y, 0);
            break;
          case 'avg':
            yValue = items.reduce((sum, item) => sum + item.y, 0) / items.length;
            break;
          case 'count':
            yValue = items.length;
            break;
          case 'min':
            yValue = Math.min(...items.map(item => item.y));
            break;
          case 'max':
            yValue = Math.max(...items.map(item => item.y));
            break;
          default:
            yValue = items[0].y;
        }

        aggregated.push({
          x: xValue,
          y: yValue,
          group: groupValue
        });
      }

      return aggregated;

    } catch (error) {
      throw new Error(`Failed to aggregate data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Format data for Chart.js consumption
   */
  private static formatForChartJs(data: any[], options: ChartOptions): ChartData {
    try {
      if (options.groupBy) {
        // Group data by the groupBy field
        const groups = new Map<string, any[]>();
        
        for (const item of data) {
          const groupKey = String(item.group || 'Unknown');
          if (!groups.has(groupKey)) {
            groups.set(groupKey, []);
          }
          groups.get(groupKey)!.push(item);
        }

        // Create datasets for each group
        const datasets: ChartDataset[] = [];
        const colors = this.generateColors(groups.size);
        let colorIndex = 0;

        for (const [groupName, groupData] of groups.entries()) {
          const color = colors[colorIndex % colors.length];
          
          datasets.push({
            label: groupName,
            data: groupData.map(item => ({
              x: item.x,
              y: item.y
            })),
            backgroundColor: options.chartType === 'bar' ? color : undefined,
            borderColor: options.chartType === 'line' ? color : undefined,
            borderWidth: options.chartType === 'line' ? 2 : 1
          });
          
          colorIndex++;
        }

        // Extract unique labels for x-axis
        const labels = [...new Set(data.map(item => String(item.x)))].sort();

        return {
          labels,
          datasets
        };

      } else {
        // Single dataset
        const dataset: ChartDataset = {
          label: `${options.yColumn} vs ${options.xColumn}`,
          data: data.map(item => ({
            x: item.x,
            y: item.y
          })),
          backgroundColor: options.chartType === 'bar' ? 'rgba(54, 162, 235, 0.6)' : undefined,
          borderColor: options.chartType === 'line' ? 'rgba(54, 162, 235, 1)' : undefined,
          borderWidth: options.chartType === 'line' ? 2 : 1
        };

        // Extract labels for x-axis
        const labels = data.map(item => String(item.x));

        return {
          labels,
          datasets: [dataset]
        };
      }

    } catch (error) {
      throw new Error(`Failed to format chart data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Optimize chart options based on data size and performance considerations
   */
  private static async optimizeChartOptions(userId: number, options: ChartOptions): Promise<ChartOptions> {
    try {
      const dataCount = await this.getDataCount(userId, options);
      const optimized = { ...options };

      // Apply automatic optimizations based on data size
      if (dataCount > 5000) {
        // For large datasets, apply aggregation if not already specified
        if (!optimized.aggregation) {
          optimized.aggregation = 'avg';
        }
        
        // Limit data points for performance
        if (!optimized.limit || optimized.limit > 1000) {
          optimized.limit = 1000;
        }
      } else if (dataCount > 1000) {
        // Medium datasets - just limit points
        if (!optimized.limit || optimized.limit > 2000) {
          optimized.limit = 2000;
        }
      }

      return optimized;

    } catch (error) {
      // Return original options if optimization fails
      return options;
    }
  }

  /**
   * Get count of data points for the given options
   */
  private static async getDataCount(userId: number, options: ChartOptions): Promise<number> {
    try {
      let query: string;
      let params: any[];

      if (options.uploadId) {
        query = `
          SELECT COUNT(*) as count
          FROM data_rows 
          WHERE user_id = ? AND upload_id = ?
            AND JSON_EXTRACT(row_data, ?) IS NOT NULL 
            AND JSON_EXTRACT(row_data, ?) IS NOT NULL
        `;
        params = [userId, options.uploadId, `$.${options.xColumn}`, `$.${options.yColumn}`];
      } else {
        query = `
          SELECT COUNT(*) as count
          FROM data_rows 
          WHERE user_id = ?
            AND JSON_EXTRACT(row_data, ?) IS NOT NULL 
            AND JSON_EXTRACT(row_data, ?) IS NOT NULL
        `;
        params = [userId, `$.${options.xColumn}`, `$.${options.yColumn}`];
      }

      // Apply filters to count query
      if (options.filters && options.filters.length > 0) {
        for (const filter of options.filters) {
          const jsonPath = `$.${filter.column}`;
          switch (filter.operator) {
            case 'eq':
              query += ` AND JSON_EXTRACT(row_data, ?) = ?`;
              params.push(jsonPath, filter.value);
              break;
            case 'gt':
              query += ` AND CAST(JSON_EXTRACT(row_data, ?) AS REAL) > ?`;
              params.push(jsonPath, filter.value);
              break;
            case 'lt':
              query += ` AND CAST(JSON_EXTRACT(row_data, ?) AS REAL) < ?`;
              params.push(jsonPath, filter.value);
              break;
            case 'contains':
              query += ` AND JSON_EXTRACT(row_data, ?) LIKE ?`;
              params.push(jsonPath, `%${filter.value}%`);
              break;
          }
        }
      }

      const result = await database.get(query, params);
      return result?.count || 0;

    } catch (error) {
      return 0;
    }
  }

  /**
   * Convert value to number, handling various formats
   */
  private static convertToNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Remove common formatting characters
      const cleaned = value.replace(/[$,\s]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  /**
   * Generate distinct colors for multiple datasets
   */
  private static generateColors(count: number): string[] {
    const baseColors = [
      'rgba(54, 162, 235, 0.8)',   // Blue
      'rgba(255, 99, 132, 0.8)',   // Red
      'rgba(75, 192, 192, 0.8)',   // Green
      'rgba(255, 206, 86, 0.8)',   // Yellow
      'rgba(153, 102, 255, 0.8)',  // Purple
      'rgba(255, 159, 64, 0.8)',   // Orange
      'rgba(199, 199, 199, 0.8)',  // Grey
      'rgba(83, 102, 255, 0.8)',   // Indigo
    ];

    const colors: string[] = [];
    for (let i = 0; i < count; i++) {
      colors.push(baseColors[i % baseColors.length]);
    }

    return colors;
  }

  /**
   * Get available numeric columns for charting
   */
  static async getNumericColumns(userId: number, uploadId?: string): Promise<ColumnInfo[]> {
    try {
      const allColumns = await DataQueryService.getColumnInfo(userId, uploadId);
      
      // Filter to numeric columns and add some common text columns that might contain numbers
      return allColumns.filter(col => 
        col.type === 'number' || 
        ['price', 'volume', 'amount', 'quantity', 'value'].some(keyword => 
          col.name.toLowerCase().includes(keyword)
        )
      );

    } catch (error) {
      throw new Error(`Failed to get numeric columns: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get sample chart data for preview
   */
  static async getChartPreview(userId: number, options: ChartOptions): Promise<ChartData> {
    try {
      // Limit preview to 50 data points for quick loading
      const previewOptions = {
        ...options,
        limit: 50
      };

      return await this.generateChartData(userId, previewOptions);

    } catch (error) {
      throw new Error(`Failed to generate chart preview: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default ChartDataService;