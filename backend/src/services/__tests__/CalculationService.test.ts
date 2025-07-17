import { CalculationService } from '../CalculationService';
import { database } from '../../database';

// Mock the database
jest.mock('../../database', () => ({
  database: {
    run: jest.fn(),
    get: jest.fn(),
    all: jest.fn()
  }
}));

describe('CalculationService', () => {
  let service: CalculationService;
  let mockRun: jest.Mock;
  let mockGet: jest.Mock;
  let mockAll: jest.Mock;

  beforeEach(() => {
    service = new CalculationService();
    mockRun = database.run as jest.Mock;
    mockGet = database.get as jest.Mock;
    mockAll = database.all as jest.Mock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('parseFormula', () => {
    it('should parse a simple formula', () => {
      const result = service.parseFormula('price * quantity');
      
      expect(result.expression).toBe('price * quantity');
      expect(result.variables).toContain('price');
      expect(result.variables).toContain('quantity');
    });

    it('should parse complex formulas', () => {
      const result = service.parseFormula('(high + low) / 2');
      
      expect(result.expression).toBe('(high + low) / 2');
      expect(result.variables).toContain('high');
      expect(result.variables).toContain('low');
    });

    it('should throw error for invalid formula', () => {
      expect(() => {
        service.parseFormula('invalid formula (');
      }).toThrow('Formula parsing failed');
    });
  });

  describe('validateFormula', () => {
    it('should validate formula with existing columns', () => {
      const columns = ['price', 'quantity', 'volume'];
      const result = service.validateFormula('price * quantity', columns);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject formula with non-existent columns', () => {
      const columns = ['price', 'quantity'];
      const result = service.validateFormula('price * volume', columns);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Column 'volume' not found in dataset");
    });

    it('should warn about formulas with no column references', () => {
      const columns = ['price', 'quantity'];
      const result = service.validateFormula('5 + 3', columns);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Formula contains no column references');
    });
  });

  describe('executeFormula', () => {
    it('should calculate values for valid data', () => {
      const formula = { expression: 'price * quantity', variables: ['price', 'quantity'] };
      const data = [
        { price: 10, quantity: 5 },
        { price: 20, quantity: 3 },
        { price: 15, quantity: 2 }
      ];
      
      const result = service.executeFormula(formula, data);
      
      expect(result.values).toEqual([50, 60, 30]);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle missing data gracefully', () => {
      const formula = { expression: 'price * quantity', variables: ['price', 'quantity'] };
      const data = [
        { price: 10, quantity: 5 },
        { price: 20 }, // missing quantity
        { quantity: 2 } // missing price
      ];
      
      const result = service.executeFormula(formula, data);
      
      expect(result.values[0]).toBe(50);
      expect(result.values[1]).toBeNull();
      expect(result.values[2]).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('generatePreview', () => {
    it('should generate preview for valid formula', () => {
      const columns = ['price', 'quantity'];
      const data = Array.from({ length: 15 }, (_, i) => ({
        price: 10 + i,
        quantity: 5 + i
      }));
      
      const result = service.generatePreview('price * quantity', data, columns);
      
      expect(result.formula).toBe('price * quantity');
      expect(result.previewValues).toHaveLength(10); // Should limit to 10 rows
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid formula', () => {
      const columns = ['price', 'quantity'];
      const data = [{ price: 10, quantity: 5 }];
      
      const result = service.generatePreview('price * volume', data, columns);
      
      expect(result.errors).toContain("Column 'volume' not found in dataset");
      expect(result.previewValues).toHaveLength(0);
    });
  });

  describe('saveCalculatedColumn', () => {
    it('should save calculated column to database', async () => {
      const mockRow = {
        id: 1,
        user_id: 123,
        upload_id: 'upload-123',
        column_name: 'total_value',
        formula: 'price * quantity',
        created_at: '2023-01-01T00:00:00.000Z'
      };
      
      mockRun.mockResolvedValue({ lastID: 1 });
      mockGet.mockResolvedValue(mockRow);
      
      const result = await service.saveCalculatedColumn(123, 'upload-123', 'total_value', 'price * quantity');
      
      expect(result.id).toBe(1);
      expect(result.userId).toBe(123);
      expect(result.uploadId).toBe('upload-123');
      expect(result.columnName).toBe('total_value');
      expect(result.formula).toBe('price * quantity');
    });
  });

  describe('getCalculatedColumns', () => {
    it('should retrieve calculated columns for user and upload', async () => {
      const mockRows = [
        {
          id: 1,
          user_id: 123,
          upload_id: 'upload-123',
          column_name: 'total_value',
          formula: 'price * quantity',
          created_at: '2023-01-01T00:00:00.000Z'
        }
      ];
      
      mockAll.mockResolvedValue(mockRows);
      
      const result = await service.getCalculatedColumns(123, 'upload-123');
      
      expect(result).toHaveLength(1);
      expect(result[0].columnName).toBe('total_value');
      expect(result[0].formula).toBe('price * quantity');
    });
  });

  describe('deleteCalculatedColumn', () => {
    it('should delete calculated column', async () => {
      mockRun.mockResolvedValue({ changes: 1 });
      
      await expect(service.deleteCalculatedColumn(123, 1)).resolves.not.toThrow();
    });

    it('should throw error if column not found', async () => {
      mockRun.mockResolvedValue({ changes: 0 });
      
      await expect(service.deleteCalculatedColumn(123, 1))
        .rejects.toThrow('Calculated column not found or access denied');
    });
  });
});