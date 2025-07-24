import { CSVService } from '../CSVService';

describe('CSVService', () => {
  describe('parseFile', () => {
    it('should parse valid CSV data correctly', async () => {
      const csvContent = 'Name,Age,City\nJohn,25,New York\nJane,30,Los Angeles';
      const buffer = Buffer.from(csvContent);
      
      const result = await CSVService.parseFile(buffer);
      
      expect(result.headers).toEqual(['Name', 'Age', 'City']);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual({ Name: 'John', Age: '25', City: 'New York' });
      expect(result.rows[1]).toEqual({ Name: 'Jane', Age: '30', City: 'Los Angeles' });
    });

    it('should handle CSV with empty values', async () => {
      const csvContent = 'Name,Age,City\nJohn,,New York\n,30,';
      const buffer = Buffer.from(csvContent);
      
      const result = await CSVService.parseFile(buffer);
      
      expect(result.rows[0]).toEqual({ Name: 'John', Age: null, City: 'New York' });
      expect(result.rows[1]).toEqual({ Name: null, Age: '30', City: null });
    });

    it('should handle CSV with quoted values', async () => {
      const csvContent = 'Name,Description\n"John Doe","A person with, comma"\n"Jane","Normal person"';
      const buffer = Buffer.from(csvContent);
      
      const result = await CSVService.parseFile(buffer);
      
      expect(result.rows[0]).toEqual({ Name: 'John Doe', Description: 'A person with, comma' });
    });

    it('should handle malformed CSV gracefully', async () => {
      const csvContent = 'Name,Age\nJohn,25,Extra\nJane'; // Inconsistent columns
      const buffer = Buffer.from(csvContent);
      
      const result = await CSVService.parseFile(buffer);
      
      // CSV parser handles this gracefully by adding extra columns
      expect(result.headers).toContain('Name');
      expect(result.headers).toContain('Age');
      expect(result.rows).toHaveLength(2);
    });
  });

  describe('validateStructure', () => {
    it('should validate correct CSV structure', () => {
      const data = {
        headers: ['Name', 'Age', 'City'],
        rows: [
          { Name: 'John', Age: '25', City: 'New York' },
          { Name: 'Jane', Age: '30', City: 'Los Angeles' }
        ]
      };
      
      const result = CSVService.validateStructure(data);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty data', () => {
      const data = {
        headers: ['Name', 'Age'],
        rows: []
      };
      
      const result = CSVService.validateStructure(data);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('CSV file is empty or contains no data rows');
    });

    it('should reject duplicate headers', () => {
      const data = {
        headers: ['Name', 'Name', 'Age'],
        rows: [{ Name: 'John', Age: '25' }]
      };
      
      const result = CSVService.validateStructure(data);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('CSV file contains duplicate column headers');
    });

    it('should reject empty headers', () => {
      const data = {
        headers: ['Name', '', 'Age'],
        rows: [{ Name: 'John', Age: '25' }]
      };
      
      const result = CSVService.validateStructure(data);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('CSV file contains empty column headers');
    });

    it('should reject files with too many rows', () => {
      const data = {
        headers: ['Name'],
        rows: Array(10001).fill({ Name: 'Test' })
      };
      
      const result = CSVService.validateStructure(data);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('CSV file exceeds maximum of 10,000 rows. Please split large datasets into smaller files.');
    });

    it('should reject invalid column names', () => {
      const data = {
        headers: ['Name', 'Age;DROP TABLE users;', 'City'],
        rows: [{ Name: 'John', Age: '25', City: 'NYC' }]
      };
      
      const result = CSVService.validateStructure(data);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Invalid column names detected'))).toBe(true);
    });
  });

  describe('detectColumnTypes', () => {
    it('should detect integer columns', () => {
      const data = {
        headers: ['Name', 'Age'],
        rows: [
          { Name: 'John', Age: '25' },
          { Name: 'Jane', Age: '30' },
          { Name: 'Bob', Age: '45' }
        ]
      };
      
      const types = CSVService.detectColumnTypes(data);
      
      expect(types.Name).toBe('text');
      expect(types.Age).toBe('integer');
    });

    it('should detect decimal columns', () => {
      const data = {
        headers: ['Name', 'Price'],
        rows: [
          { Name: 'Item1', Price: '25.50' },
          { Name: 'Item2', Price: '30.75' }
        ]
      };
      
      const types = CSVService.detectColumnTypes(data);
      
      expect(types.Price).toBe('decimal');
    });

    it('should detect date columns', () => {
      const data = {
        headers: ['Name', 'Date'],
        rows: [
          { Name: 'Event1', Date: '2023-01-15' },
          { Name: 'Event2', Date: '2023-12-25' },
          { Name: 'Event3', Date: '2024-03-10' }
        ]
      };
      
      const types = CSVService.detectColumnTypes(data);
      
      expect(types.Date).toBe('date');
    });

    it('should default to text for mixed types', () => {
      const data = {
        headers: ['Name', 'Mixed'],
        rows: [
          { Name: 'Item1', Mixed: '25' },
          { Name: 'Item2', Mixed: 'text' }
        ]
      };
      
      const types = CSVService.detectColumnTypes(data);
      
      expect(types.Mixed).toBe('text');
    });
  });
});