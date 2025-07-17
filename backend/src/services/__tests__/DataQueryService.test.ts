import { DataQueryService } from '../DataQueryService';
import { database } from '../../database';
import { QueryOptions, Filter } from '../../types';

// Mock the database
jest.mock('../../database', () => ({
  database: {
    get: jest.fn(),
    all: jest.fn(),
    run: jest.fn()
  },
  createQueryBuilder: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    execute: jest.fn()
  })),
  QueryHelpers: {
    applyPagination: jest.fn().mockReturnValue({})
  }
}));

describe('DataQueryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserData', () => {
    it('should retrieve user data with pagination', async () => {
      const mockData = [
        {
          id: 1,
          user_id: 1,
          upload_id: 'upload-1',
          row_index: 0,
          row_data: '{"symbol": "AAPL", "price": 150.00}',
          uploaded_at: '2024-01-01T00:00:00Z',
          filename: 'test.csv',
          column_names: '["symbol", "price"]'
        }
      ];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(mockData)
      };

      require('../../database').createQueryBuilder.mockReturnValue(mockQueryBuilder);
      (database.get as jest.Mock).mockResolvedValue({ count: 1 });

      const options: QueryOptions = {
        page: 1,
        limit: 10
      };

      const result = await DataQueryService.getUserData(1, options);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].data).toEqual({ symbol: 'AAPL', price: 150.00 });
      expect(result.totalCount).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should handle filters correctly', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue([])
      };

      require('../../database').createQueryBuilder.mockReturnValue(mockQueryBuilder);
      (database.get as jest.Mock).mockResolvedValue({ count: 0 });

      const filters: Filter[] = [
        { column: 'filename', operator: 'contains', value: 'test' }
      ];

      const options: QueryOptions = {
        page: 1,
        limit: 10,
        filters
      };

      await DataQueryService.getUserData(1, options);

      expect(mockQueryBuilder.where).toHaveBeenCalled();
    });
  });

  describe('getUploadData', () => {
    it('should retrieve data for specific upload', async () => {
      // Mock upload metadata
      (database.get as jest.Mock)
        .mockResolvedValueOnce({
          id: 'upload-1',
          user_id: 1,
          filename: 'test.csv',
          row_count: 1,
          column_names: '["symbol", "price"]',
          uploaded_at: '2024-01-01T00:00:00Z'
        })
        .mockResolvedValueOnce({ count: 1 });

      const mockData = [
        {
          id: 1,
          user_id: 1,
          upload_id: 'upload-1',
          row_index: 0,
          row_data: '{"symbol": "AAPL", "price": 150.00}',
          uploaded_at: '2024-01-01T00:00:00Z'
        }
      ];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(mockData)
      };

      require('../../database').createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const options: QueryOptions = {
        page: 1,
        limit: 10
      };

      const result = await DataQueryService.getUploadData(1, 'upload-1', options);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].data).toEqual({ symbol: 'AAPL', price: 150.00 });
    });

    it('should throw error for non-existent upload', async () => {
      (database.get as jest.Mock).mockResolvedValue(null);

      const options: QueryOptions = {
        page: 1,
        limit: 10
      };

      await expect(
        DataQueryService.getUploadData(1, 'non-existent', options)
      ).rejects.toThrow('Upload not found or access denied');
    });

    it('should handle column-based sorting', async () => {
      // Mock upload metadata
      (database.get as jest.Mock)
        .mockResolvedValueOnce({
          id: 'upload-1',
          user_id: 1,
          filename: 'test.csv',
          row_count: 1,
          column_names: '["symbol", "price"]',
          uploaded_at: '2024-01-01T00:00:00Z'
        })
        .mockResolvedValueOnce({ count: 1 });

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue([])
      };

      require('../../database').createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const options: QueryOptions = {
        page: 1,
        limit: 10,
        sortBy: 'price',
        sortOrder: 'desc'
      };

      await DataQueryService.getUploadData(1, 'upload-1', options);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        "JSON_EXTRACT(row_data, '$.price')",
        'DESC'
      );
    });

    it('should handle column-based filters', async () => {
      // Mock upload metadata
      (database.get as jest.Mock)
        .mockResolvedValueOnce({
          id: 'upload-1',
          user_id: 1,
          filename: 'test.csv',
          row_count: 1,
          column_names: '["symbol", "price"]',
          uploaded_at: '2024-01-01T00:00:00Z'
        })
        .mockResolvedValueOnce({ count: 0 });

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue([])
      };

      require('../../database').createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const filters: Filter[] = [
        { column: 'symbol', operator: 'eq', value: 'AAPL' },
        { column: 'price', operator: 'gt', value: 100 }
      ];

      const options: QueryOptions = {
        page: 1,
        limit: 10,
        filters
      };

      await DataQueryService.getUploadData(1, 'upload-1', options);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        "JSON_EXTRACT(row_data, ?) = ?",
        '$.symbol',
        'AAPL'
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        "CAST(JSON_EXTRACT(row_data, ?) AS REAL) > ?",
        '$.price',
        100
      );
    });
  });

  describe('getColumnInfo', () => {
    it('should return column information for user uploads', async () => {
      const mockUploads = [
        {
          id: 'upload-1',
          user_id: 1,
          filename: 'test1.csv',
          row_count: 10,
          column_names: '["symbol", "price"]',
          uploaded_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'upload-2',
          user_id: 1,
          filename: 'test2.csv',
          row_count: 5,
          column_names: '["symbol", "volume"]',
          uploaded_at: '2024-01-02T00:00:00Z'
        }
      ];

      // Mock the getUserUploads call within getColumnInfo
      (database.all as jest.Mock)
        .mockResolvedValueOnce(mockUploads) // For getUserUploads
        .mockResolvedValue([{ value: '150.00' }]); // For type inference calls

      const result = await DataQueryService.getColumnInfo(1);

      expect(result).toHaveLength(3); // symbol, price, volume
      expect(result.map(col => col.name).sort()).toEqual(['price', 'symbol', 'volume']);
      expect(result.every(col => col.nullable)).toBe(true);
    });

    it('should return column info for specific upload', async () => {
      (database.get as jest.Mock).mockResolvedValue({
        id: 'upload-1',
        user_id: 1,
        filename: 'test.csv',
        row_count: 10,
        column_names: '["symbol", "price"]',
        uploaded_at: '2024-01-01T00:00:00Z'
      });

      (database.all as jest.Mock).mockResolvedValue([{ value: '150.00' }]);

      const result = await DataQueryService.getColumnInfo(1, 'upload-1');

      expect(result).toHaveLength(2);
      expect(result.map(col => col.name).sort()).toEqual(['price', 'symbol']);
    });
  });

  describe('getCalculatedColumns', () => {
    it('should retrieve calculated columns for user', async () => {
      const mockColumns = [
        {
          id: 1,
          user_id: 1,
          upload_id: 'upload-1',
          column_name: 'profit_loss',
          formula: 'price * quantity',
          created_at: '2024-01-01T00:00:00Z'
        }
      ];

      (database.all as jest.Mock).mockResolvedValue(mockColumns);

      const result = await DataQueryService.getCalculatedColumns(1);

      expect(result).toHaveLength(1);
      expect(result[0].columnName).toBe('profit_loss');
      expect(result[0].formula).toBe('price * quantity');
    });

    it('should filter by upload ID when provided', async () => {
      (database.all as jest.Mock).mockResolvedValue([]);

      await DataQueryService.getCalculatedColumns(1, 'upload-1');

      expect(database.all).toHaveBeenCalledWith(
        expect.stringContaining('AND upload_id = ?'),
        [1, 'upload-1']
      );
    });
  });

  describe('transformDataForFrontend', () => {
    it('should transform data rows for frontend consumption', () => {
      const dataRows = [
        {
          id: 1,
          userId: 1,
          uploadId: 'upload-1',
          rowIndex: 0,
          data: { symbol: 'AAPL', price: 150.00 }
        },
        {
          id: 2,
          userId: 1,
          uploadId: 'upload-1',
          rowIndex: 1,
          data: { symbol: 'GOOGL', price: 2500.00 }
        }
      ];

      const result = DataQueryService.transformDataForFrontend(dataRows);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        uploadId: 'upload-1',
        rowIndex: 0,
        symbol: 'AAPL',
        price: 150.00
      });
      expect(result[1]).toEqual({
        id: 2,
        uploadId: 'upload-1',
        rowIndex: 1,
        symbol: 'GOOGL',
        price: 2500.00
      });
    });
  });

  describe('getDashboardStats', () => {
    it('should return dashboard statistics', async () => {
      const mockStats = {
        total_uploads: 5,
        total_rows: 1000,
        last_upload: '2024-01-01T00:00:00Z'
      };

      const mockUploads = [
        {
          id: 'upload-1',
          user_id: 1,
          filename: 'test1.csv',
          row_count: 10,
          column_names: '["symbol", "price", "volume"]',
          uploaded_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'upload-2',
          user_id: 1,
          filename: 'test2.csv',
          row_count: 5,
          column_names: '["symbol", "quantity"]',
          uploaded_at: '2024-01-02T00:00:00Z'
        }
      ];

      (database.get as jest.Mock).mockResolvedValue(mockStats);
      (database.all as jest.Mock).mockResolvedValue(mockUploads);

      const result = await DataQueryService.getDashboardStats(1);

      expect(result.totalRows).toBe(1000);
      expect(result.totalUploads).toBe(5);
      expect(result.lastUploadDate).toEqual(new Date('2024-01-01T00:00:00Z'));
      expect(result.uniqueColumns).toBe(4); // symbol, price, volume, quantity
    });

    it('should handle empty data gracefully', async () => {
      (database.get as jest.Mock).mockResolvedValue({
        total_uploads: 0,
        total_rows: 0,
        last_upload: null
      });
      (database.all as jest.Mock).mockResolvedValue([]);

      const result = await DataQueryService.getDashboardStats(1);

      expect(result.totalRows).toBe(0);
      expect(result.totalUploads).toBe(0);
      expect(result.lastUploadDate).toBeNull();
      expect(result.uniqueColumns).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockRejectedValue(new Error('Database error'))
      };

      require('../../database').createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const options: QueryOptions = {
        page: 1,
        limit: 10
      };

      await expect(
        DataQueryService.getUserData(1, options)
      ).rejects.toThrow('Failed to retrieve user data: Database error');
    });

    it('should handle JSON parsing errors', async () => {
      const mockData = [
        {
          id: 1,
          user_id: 1,
          upload_id: 'upload-1',
          row_index: 0,
          row_data: 'invalid json',
          uploaded_at: '2024-01-01T00:00:00Z'
        }
      ];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(mockData)
      };

      require('../../database').createQueryBuilder.mockReturnValue(mockQueryBuilder);
      (database.get as jest.Mock).mockResolvedValue({ count: 1 });

      const options: QueryOptions = {
        page: 1,
        limit: 10
      };

      await expect(
        DataQueryService.getUserData(1, options)
      ).rejects.toThrow('Failed to retrieve user data');
    });
  });
});