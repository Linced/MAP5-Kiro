import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { ParsedData, ValidationResult } from '../types';

export class CSVService {
  /**
   * Parse CSV file buffer into structured data
   */
  static async parseFile(fileBuffer: Buffer): Promise<ParsedData> {
    return new Promise((resolve, reject) => {
      const rows: Record<string, any>[] = [];
      let headers: string[] = [];
      let isFirstRow = true;
      
      const stream = Readable.from(fileBuffer.toString('utf8'));
      
      stream
        .pipe(csvParser())
        .on('headers', (headerList: string[]) => {
          headers = headerList.map(header => header.trim());
        })
        .on('data', (row: Record<string, any>) => {
          if (isFirstRow) {
            // Ensure we have headers
            if (headers.length === 0) {
              headers = Object.keys(row).map(key => key.trim());
            }
            isFirstRow = false;
          }
          
          // Clean up row data - trim string values and handle empty values
          const cleanedRow: Record<string, any> = {};
          for (const [key, value] of Object.entries(row)) {
            const cleanKey = key.trim();
            if (typeof value === 'string') {
              const trimmedValue = value.trim();
              // Convert empty strings to null for better data handling
              cleanedRow[cleanKey] = trimmedValue === '' ? null : trimmedValue;
            } else {
              cleanedRow[cleanKey] = value;
            }
          }
          
          rows.push(cleanedRow);
        })
        .on('end', () => {
          resolve({
            headers,
            rows
          });
        })
        .on('error', (error) => {
          reject(new Error(`CSV parsing failed: ${error.message}`));
        });
    });
  }
  
  /**
   * Validate CSV data structure and content
   */
  static validateStructure(data: ParsedData): ValidationResult {
    const errors: string[] = [];
    
    // Check if data exists
    if (!data || !data.rows || !data.headers) {
      errors.push('Invalid CSV data structure');
      return { isValid: false, errors };
    }
    
    // Check if file is empty
    if (data.rows.length === 0) {
      errors.push('CSV file is empty or contains no data rows');
      return { isValid: false, errors };
    }
    
    // Check if headers exist
    if (data.headers.length === 0) {
      errors.push('CSV file must contain column headers');
      return { isValid: false, errors };
    }
    
    // Check for duplicate headers
    const headerSet = new Set(data.headers);
    if (headerSet.size !== data.headers.length) {
      errors.push('CSV file contains duplicate column headers');
    }
    
    // Check for empty headers
    const emptyHeaders = data.headers.filter(header => !header || header.trim() === '');
    if (emptyHeaders.length > 0) {
      errors.push('CSV file contains empty column headers');
    }
    
    // Validate row consistency
    const expectedColumnCount = data.headers.length;
    const inconsistentRows = data.rows.filter(row => 
      Object.keys(row).length !== expectedColumnCount
    );
    
    if (inconsistentRows.length > 0) {
      errors.push(`${inconsistentRows.length} rows have inconsistent column counts`);
    }
    
    // Check for reasonable data size (under 1000 rows as per requirements)
    if (data.rows.length > 1000) {
      errors.push('CSV file exceeds maximum of 1000 rows for MVP version');
    }
    
    // Validate column names (basic validation)
    const invalidColumnNames = data.headers.filter(header => {
      // Check for SQL injection patterns or invalid characters
      return /[;'"\\]/.test(header) || header.length > 100;
    });
    
    if (invalidColumnNames.length > 0) {
      errors.push(`Invalid column names detected: ${invalidColumnNames.join(', ')}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Detect column data types based on sample data
   */
  static detectColumnTypes(data: ParsedData): Record<string, string> {
    const columnTypes: Record<string, string> = {};
    
    for (const header of data.headers) {
      const sampleValues = data.rows
        .slice(0, Math.min(10, data.rows.length)) // Sample first 10 rows
        .map(row => row[header])
        .filter(value => value !== null && value !== undefined && value !== '');
      
      if (sampleValues.length === 0) {
        columnTypes[header] = 'text';
        continue;
      }
      
      // Check for dates FIRST (before numbers)
      const dateValues = sampleValues.filter(value => this.isValidDate(value));
      if (dateValues.length === sampleValues.length && sampleValues.length > 0) {
        columnTypes[header] = 'date';
        continue;
      }
      
      // Then check if all values are integers
      const integerValues = sampleValues.filter(value => this.isInteger(value));
      if (integerValues.length === sampleValues.length) {
        columnTypes[header] = 'integer';
        continue;
      }
      
      // Then check if all values are decimals
      const decimalValues = sampleValues.filter(value => this.isDecimal(value));
      if (decimalValues.length === sampleValues.length) {
        columnTypes[header] = 'decimal';
        continue;
      }
      
      // Default to text
      columnTypes[header] = 'text';
    }
    
    return columnTypes;
  }
  
  /**
   * Check if a value is a valid date
   */
  private static isValidDate(value: string): boolean {
    // Check for common date formats first
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
      /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
      /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO datetime
    ];
    
    const matchesPattern = datePatterns.some(pattern => pattern.test(value));
    if (!matchesPattern) return false;
    
    const date = new Date(value);
    return !isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100;
  }
  
  /**
   * Check if a value is an integer
   */
  private static isInteger(value: string): boolean {
    return /^-?\d+$/.test(value);
  }
  
  /**
   * Check if a value is a decimal number
   */
  private static isDecimal(value: string): boolean {
    return /^-?\d*\.\d+$/.test(value);
  }
}

export default CSVService;