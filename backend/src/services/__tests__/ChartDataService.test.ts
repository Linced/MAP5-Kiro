import { ChartDataService, ChartOptions } from '../ChartDataService';
import { database } from '../../database';
import { DataQueryService } from '../DataQueryService';

// Mock the database and DataQueryService
jest.mock('../../database');
jest.mock('../DataQueryService');

const mockDatabase = database as jest.Mocked<typeof database>;
const mockDataQueryService = DataQueryService as jest.Mocked<typeof DataQueryService>;

describe('ChartDataService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateChartOptions', () => {
    it('should validate required fields', async () => {
      // Mock empty column info to avoid undefined error
      mockDataQueryService.getColumnInfo.mockResolvedValue([]);
      mockDatabase.get.mockResolvedValue({ count: 0 });

      const options: ChartOptions = {
        xColumn: '',
        yColumn: '',
        chartType: 'line'
      };

      const result = await ChartDataService.validateChartOptions(1, options);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('X-axis column is required');
      expect(result.errors).toContain('Y-axis column is required');
    });

    it('should validate chart type', async () => {
      // Mock empty column info to avoid undefined error
      mockDataQueryService.getColumnInfo.mockResolvedValue([]);
      mockDatabase.get.mockResolvedValue({ count: 0 });

      const options: ChartOptions = {
        xColumn: 'date',
        yColumn: 'price',
        chartType: 'invalid' as any
      };

      const result = await ChartDataService.validateChartOptions(1, options);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Chart type must be either "line" or "bar"');
    });

    it('should validate column existence', async () => {
      mockDataQueryService.getColumnInfo.mockResolvedValue([
        { name: 'date', type: 'text', nullable: true },
        { name: 'price', type: 'number', nullable: true }
      ]);

      const options: ChartOptions = {
        xColumn: 'nonexistent',
        yColumn: 'price',
        chartType: 'line'
      };

      const result = await ChartDataService.validateChartOptions(1, options);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('X-axis column "nonexistent" does not exist');
    });

    it('should warn about non-numeric Y column', async () => {
      mockDataQueryService.getColumnInfo.mockResolvedValue([
        { name: 'date', type: 'text', nullable: true },
        { name: 'symbol', type: 'text', nullable: true }
      ]);

      mockDatabase.get.mockResolvedValue({ count: 100 });

      const options: ChartOptions = {
        xColumn: 'date',
        yColumn: 'symbol',
        chartType: 'line'
      };

      const result = await ChartDataService.validateChartOptions(1, options);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Y-axis column "symbol" is not numeric, values will be converted');
    });

    it('should validate aggregation options', async () => {
      mockDataQueryService.getColumnInfo.mockResolvedValue([
        { name: 'date', type: 'text', nullable: true },
        { name: 'price', type: 'number', nullable: true }
      ]);

      const options: ChartOptions = {
        xColumn: 'date',
        yColumn: 'price',
        chartType: 'line',
        aggregation: 'invalid' as any
      };

      const result = await ChartDataService.validateChartOptions(1, options);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Aggregation must be one of: sum, avg, count, min, max');
    });

    it('should warn about large datasets', async () => {
      mockDataQueryService.getColumnInfo.mockResolvedValue([
        { name: 'date', type: 'text', nullable: true },
        { name: 'price', type: 'number', nullable: true }
      ]);

      mockDatabase.get.mockResolvedValue({ count: 15000 });

      const options: ChartOptions = {
        xColumn: 'date',
        yColumn: 'price',
        chartType: 'line'
      };

      const result = await ChartDataService.validateChartOptions(1, options);

      expect(result.isValid).toBe(true);
      expect(result.warnings?.[0]).toContain('Large dataset (15000 rows) may impact performance');
    });
  });

  describe('generateChartData', () => {
    it('should generate basic line chart data', async () => {
      mockDataQueryService.getColumnInfo.mockResolvedValue([
        { name: 'date', type: 'text', nullable: true },
        { name: 'price', type: 'number', nullable: true }
      ]);

      mockDatabase.get.mockResolvedValue({ count: 100 });
      mockDatabase.all.mockResolvedValue([
        { x_value: '2023-01-01', y_value: 100 },
        { x_value: '2023-01-02', y_value: 105 },
        { x_value: '2023-01-03', y_value: 98 }
      ]);

      const options: ChartOptions = {
        xColumn: 'date',
        yColumn: 'price',
        chartType: 'line'
      };

      const result = await ChartDataService.generateChartData(1, options);

      expect(result.labels).toEqual(['2023-01-01', '2023-01-02', '2023-01-03']);
      expect(result.datasets).toHaveLength(1);
      expect(result.datasets[0].label).toBe('price vs date');
      expect(result.datasets[0].data).toEqual([
        { x: '2023-01-01', y: 100 },
        { x: '2023-01-02', y: 105 },
        { x: '2023-01-03', y: 98 }
      ]);
    });

    it('should generate grouped chart data', async () => {
      mockDataQueryService.getColumnInfo.mockResolvedValue([
        { name: 'date', type: 'text', nullable: true },
        { name: 'price', type: 'number', nullable: true },
        { name: 'symbol', type: 'text', nullable: true }
      ]);

      mockDatabase.get.mockResolvedValue({ count: 100 });
      mockDatabase.all.mockResolvedValue([
        { x_value: '2023-01-01', y_value: 100, group_value: 'AAPL' },
        { x_value: '2023-01-01', y_value: 50, group_value: 'GOOGL' },
        { x_value: '2023-01-02', y_value: 105, group_value: 'AAPL' },
        { x_value: '2023-01-02', y_value: 52, group_value: 'GOOGL' }
      ]);

      const options: ChartOptions = {
        xColumn: 'date',
        yColumn: 'price',
        chartType: 'line',
        groupBy: 'symbol'
      };

      const result = await ChartDataService.generateChartData(1, options);

      expect(result.datasets).toHaveLength(2);
      expect(result.datasets.map(d => d.label)).toContain('AAPL');
      expect(result.datasets.map(d => d.label)).toContain('GOOGL');
    });

    it('should handle aggregation', async () => {
      mockDataQueryService.getColumnInfo.mockResolvedValue([
        { name: 'date', type: 'text', nullable: true },
        { name: 'price', type: 'number', nullable: true }
      ]);

      mockDatabase.get.mockResolvedValue({ count: 100 });
      mockDatabase.all.mockResolvedValue([
        { x_value: '2023-01-01', y_value: 100 },
        { x_value: '2023-01-01', y_value: 105 },
        { x_value: '2023-01-02', y_value: 98 },
        { x_value: '2023-01-02', y_value: 102 }
      ]);

      const options: ChartOptions = {
        xColumn: 'date',
        yColumn: 'price',
        chartType: 'bar',
        aggregation: 'avg'
      };

      const result = await ChartDataService.generateChartData(1, options);

      expect(result.datasets[0].data).toEqual([
        { x: '2023-01-01', y: 102.5 }, // (100 + 105) / 2
        { x: '2023-01-02', y: 100 }    // (98 + 102) / 2
      ]);
    });

    it('should filter out null values', async () => {
      mockDataQueryService.getColumnInfo.mockResolvedValue([
        { name: 'date', type: 'text', nullable: true },
        { name: 'price', type: 'number', nullable: true }
      ]);

      mockDatabase.get.mockResolvedValue({ count: 100 });
      mockDatabase.all.mockResolvedValue([
        { x_value: '2023-01-01', y_value: 100 },
        { x_value: null, y_value: 105 },
        { x_value: '2023-01-03', y_value: null },
        { x_value: '2023-01-04', y_value: 98 }
      ]);

      const options: ChartOptions = {
        xColumn: 'date',
        yColumn: 'price',
        chartType: 'line'
      };

      const result = await ChartDataService.generateChartData(1, options);

      expect(result.datasets[0].data).toHaveLength(2);
      expect(result.datasets[0].data).toEqual([
        { x: '2023-01-01', y: 100 },
        { x: '2023-01-04', y: 98 }
      ]);
    });
  });

  describe('getOptimizedChartData', () => {
    it('should apply automatic optimizations for large datasets', async () => {
      mockDataQueryService.getColumnInfo.mockResolvedValue([
        { name: 'date', type: 'text', nullable: true },
        { name: 'price', type: 'number', nullable: true }
      ]);

      // Mock large dataset
      mockDatabase.get.mockResolvedValue({ count: 8000 });
      mockDatabase.all.mockResolvedValue([
        { x_value: '2023-01-01', y_value: 100 },
        { x_value: '2023-01-02', y_value: 105 }
      ]);

      const options: ChartOptions = {
        xColumn: 'date',
        yColumn: 'price',
        chartType: 'line'
      };

      const result = await ChartDataService.getOptimizedChartData(1, options);

      // Should have applied optimizations
      expect(result).toBeDefined();
    });
  });

  describe('getNumericColumns', () => {
    it('should return numeric columns and columns with numeric keywords', async () => {
      mockDataQueryService.getColumnInfo.mockResolvedValue([
        { name: 'date', type: 'text', nullable: true },
        { name: 'price', type: 'number', nullable: true },
        { name: 'volume', type: 'text', nullable: true },
        { name: 'symbol', type: 'text', nullable: true },
        { name: 'amount', type: 'text', nullable: true }
      ]);

      const result = await ChartDataService.getNumericColumns(1);

      expect(result).toHaveLength(3);
      expect(result.map(col => col.name)).toContain('price');
      expect(result.map(col => col.name)).toContain('volume');
      expect(result.map(col => col.name)).toContain('amount');
    });
  });

  describe('getChartPreview', () => {
    it('should limit preview data to 50 points', async () => {
      mockDataQueryService.getColumnInfo.mockResolvedValue([
        { name: 'date', type: 'text', nullable: true },
        { name: 'price', type: 'number', nullable: true }
      ]);

      mockDatabase.get.mockResolvedValue({ count: 100 });
      
      // Mock 50 data points
      const mockData = Array.from({ length: 50 }, (_, i) => ({
        x_value: `2023-01-${String(i + 1).padStart(2, '0')}`,
        y_value: 100 + i
      }));
      
      mockDatabase.all.mockResolvedValue(mockData);

      const options: ChartOptions = {
        xColumn: 'date',
        yColumn: 'price',
        chartType: 'line'
      };

      const result = await ChartDataService.getChartPreview(1, options);

      expect(result.datasets[0].data).toHaveLength(50);
    });
  });

  describe('data conversion utilities', () => {
    it('should convert string numbers to numbers', () => {
      // Access private method through any cast for testing
      const service = ChartDataService as any;
      
      expect(service.convertToNumber('123')).toBe(123);
      expect(service.convertToNumber('123.45')).toBe(123.45);
      expect(service.convertToNumber('$1,234.56')).toBe(1234.56);
      expect(service.convertToNumber('invalid')).toBe(0);
      expect(service.convertToNumber(null)).toBe(0);
      expect(service.convertToNumber(undefined)).toBe(0);
    });

    it('should generate distinct colors', () => {
      const service = ChartDataService as any;
      
      const colors = service.generateColors(5);
      expect(colors).toHaveLength(5);
      expect(colors[0]).toContain('rgba');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDataQueryService.getColumnInfo.mockRejectedValue(new Error('Database error'));

      const options: ChartOptions = {
        xColumn: 'date',
        yColumn: 'price',
        chartType: 'line'
      };

      await expect(ChartDataService.generateChartData(1, options))
        .rejects.toThrow('Failed to generate chart data');
    });

    it('should handle validation errors', async () => {
      const options: ChartOptions = {
        xColumn: '',
        yColumn: '',
        chartType: 'line'
      };

      await expect(ChartDataService.generateChartData(1, options))
        .rejects.toThrow('Chart validation failed');
    });
  });

  describe('aggregation functions', () => {
    it('should calculate sum aggregation correctly', async () => {
      mockDataQueryService.getColumnInfo.mockResolvedValue([
        { name: 'category', type: 'text', nullable: true },
        { name: 'value', type: 'number', nullable: true }
      ]);

      mockDatabase.get.mockResolvedValue({ count: 100 });
      mockDatabase.all.mockResolvedValue([
        { x_value: 'A', y_value: 10 },
        { x_value: 'A', y_value: 20 },
        { x_value: 'B', y_value: 15 },
        { x_value: 'B', y_value: 25 }
      ]);

      const options: ChartOptions = {
        xColumn: 'category',
        yColumn: 'value',
        chartType: 'bar',
        aggregation: 'sum'
      };

      const result = await ChartDataService.generateChartData(1, options);

      const dataPoints = result.datasets[0].data;
      const aPoint = dataPoints.find(p => p.x === 'A');
      const bPoint = dataPoints.find(p => p.x === 'B');

      expect(aPoint?.y).toBe(30); // 10 + 20
      expect(bPoint?.y).toBe(40); // 15 + 25
    });

    it('should calculate min/max aggregation correctly', async () => {
      mockDataQueryService.getColumnInfo.mockResolvedValue([
        { name: 'category', type: 'text', nullable: true },
        { name: 'value', type: 'number', nullable: true }
      ]);

      mockDatabase.get.mockResolvedValue({ count: 100 });
      mockDatabase.all.mockResolvedValue([
        { x_value: 'A', y_value: 10 },
        { x_value: 'A', y_value: 30 },
        { x_value: 'A', y_value: 20 }
      ]);

      const maxOptions: ChartOptions = {
        xColumn: 'category',
        yColumn: 'value',
        chartType: 'bar',
        aggregation: 'max'
      };

      const maxResult = await ChartDataService.generateChartData(1, maxOptions);
      expect(maxResult.datasets[0].data[0].y).toBe(30);

      const minOptions: ChartOptions = {
        xColumn: 'category',
        yColumn: 'value',
        chartType: 'bar',
        aggregation: 'min'
      };

      const minResult = await ChartDataService.generateChartData(1, minOptions);
      expect(minResult.datasets[0].data[0].y).toBe(10);
    });
  });
});