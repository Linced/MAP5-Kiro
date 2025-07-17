import request from 'supertest';
import express from 'express';
import dataRouter from '../data';
import { DataQueryService } from '../../services/DataQueryService';
import { DataStorageService } from '../../services/DataStorageService';

// Mock the services
jest.mock('../../services/DataQueryService');
jest.mock('../../services/DataStorageService');
jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { id: 1, email: 'test@example.com' };
    next();
  }
}));

const app = express();
app.use(express.json());
app.use('/api/data', dataRouter);

const mockDataQueryService = DataQueryService as jest.Mocked<typeof DataQueryService>;
const mockDataStorageService = DataStorageService as jest.Mocked<typeof DataStorageService>;

describe('Data Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/data', () => {
    it('should retrieve user data with pagination', async () => {
      const mockResult = {
        data: [
          {
            id: 1,
            userId: 1,
            uploadId: 'upload-1',
            rowIndex: 0,
            data: { symbol: 'AAPL', price: 150.00 }
          }
        ],
        totalCount: 1,
        page: 1,
        limit: 100
      };

      mockDataQueryService.getUserData.mockResolvedValue(mockResult);
      mockDataQueryService.transformDataForFrontend.mockReturnValue([
        {
          id: 1,
          uploadId: 'upload-1',
          rowIndex: 0,
          symbol: 'AAPL',
          price: 150.00
        }
      ]);

      const response = await request(app)
        .get('/api/data')
        .query({ page: '1', limit: '100' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.rows).toHaveLength(1);
      expect(response.body.data.pagination.totalCount).toBe(1);
      expect(mockDataQueryService.getUserData).toHaveBeenCalledWith(1, {
        page: 1,
        limit: 100,
        sortBy: undefined,
        sortOrder: 'asc'
      });
    });

    it('should handle filters correctly', async () => {
      const mockResult = {
        data: [],
        totalCount: 0,
        page: 1,
        limit: 100
      };

      mockDataQueryService.getUserData.mockResolvedValue(mockResult);
      mockDataQueryService.transformDataForFrontend.mockReturnValue([]);

      const filters = JSON.stringify([
        { column: 'symbol', operator: 'eq', value: 'AAPL' }
      ]);

      const response = await request(app)
        .get('/api/data')
        .query({ filters });

      expect(response.status).toBe(200);
      expect(mockDataQueryService.getUserData).toHaveBeenCalledWith(1, {
        page: 1,
        limit: 100,
        sortBy: undefined,
        sortOrder: 'asc',
        filters: [{ column: 'symbol', operator: 'eq', value: 'AAPL' }]
      });
    });

    it('should handle invalid filters', async () => {
      const response = await request(app)
        .get('/api/data')
        .query({ filters: 'invalid-json' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_FILTERS');
    });

    it('should handle service errors', async () => {
      mockDataQueryService.getUserData.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/data');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DATA_RETRIEVAL_ERROR');
    });
  });

  describe('GET /api/data/upload/:uploadId', () => {
    it('should retrieve data for specific upload', async () => {
      const mockResult = {
        data: [
          {
            id: 1,
            userId: 1,
            uploadId: 'upload-1',
            rowIndex: 0,
            data: { symbol: 'AAPL', price: 150.00 }
          }
        ],
        totalCount: 1,
        page: 1,
        limit: 100
      };

      mockDataQueryService.getUploadData.mockResolvedValue(mockResult);
      mockDataQueryService.transformDataForFrontend.mockReturnValue([
        {
          id: 1,
          uploadId: 'upload-1',
          rowIndex: 0,
          symbol: 'AAPL',
          price: 150.00
        }
      ]);

      const response = await request(app)
        .get('/api/data/upload/upload-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.rows).toHaveLength(1);
      expect(mockDataQueryService.getUploadData).toHaveBeenCalledWith(1, 'upload-1', {
        page: 1,
        limit: 100,
        sortBy: undefined,
        sortOrder: 'asc'
      });
    });

    it('should handle upload not found', async () => {
      mockDataQueryService.getUploadData.mockRejectedValue(new Error('Upload not found'));

      const response = await request(app)
        .get('/api/data/upload/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UPLOAD_NOT_FOUND');
    });
  });

  describe('GET /api/data/columns', () => {
    it('should retrieve column information', async () => {
      const mockColumns = [
        { name: 'symbol', type: 'text', nullable: true },
        { name: 'price', type: 'number', nullable: true }
      ];

      mockDataQueryService.getColumnInfo.mockResolvedValue(mockColumns);

      const response = await request(app)
        .get('/api/data/columns');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.columns).toEqual(mockColumns);
      expect(mockDataQueryService.getColumnInfo).toHaveBeenCalledWith(1, undefined);
    });

    it('should retrieve column info for specific upload', async () => {
      const mockColumns = [
        { name: 'symbol', type: 'text', nullable: true }
      ];

      mockDataQueryService.getColumnInfo.mockResolvedValue(mockColumns);

      const response = await request(app)
        .get('/api/data/columns')
        .query({ uploadId: 'upload-1' });

      expect(response.status).toBe(200);
      expect(mockDataQueryService.getColumnInfo).toHaveBeenCalledWith(1, 'upload-1');
    });
  });

  describe('GET /api/data/columns/calculated', () => {
    it('should retrieve calculated columns', async () => {
      const mockCalculatedColumns = [
        {
          id: 1,
          userId: 1,
          uploadId: 'upload-1',
          columnName: 'profit_loss',
          formula: 'exit_price - entry_price',
          createdAt: new Date()
        }
      ];

      mockDataQueryService.getCalculatedColumns.mockResolvedValue(mockCalculatedColumns);

      const response = await request(app)
        .get('/api/data/columns/calculated');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.calculatedColumns).toHaveLength(1);
      expect(response.body.data.calculatedColumns[0].columnName).toBe('profit_loss');
    });
  });

  describe('GET /api/data/stats', () => {
    it('should retrieve dashboard statistics', async () => {
      const mockStats = {
        totalRows: 100,
        totalUploads: 5,
        lastUploadDate: new Date(),
        uniqueColumns: 10
      };

      mockDataQueryService.getDashboardStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/data/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.stats.totalRows).toBe(100);
      expect(response.body.data.stats.totalUploads).toBe(5);
      expect(response.body.data.stats.uniqueColumns).toBe(10);
    });
  });

  describe('GET /api/data/uploads', () => {
    it('should retrieve user uploads', async () => {
      const mockUploads = [
        {
          id: 'upload-1',
          userId: 1,
          filename: 'trades.csv',
          rowCount: 100,
          columnNames: ['symbol', 'price'],
          uploadedAt: new Date()
        }
      ];

      mockDataStorageService.getUserUploads.mockResolvedValue(mockUploads);

      const response = await request(app)
        .get('/api/data/uploads');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.uploads).toHaveLength(1);
      expect(response.body.data.uploads[0].filename).toBe('trades.csv');
      expect(mockDataStorageService.getUserUploads).toHaveBeenCalledWith(1, 10);
    });
  });

  describe('POST /api/data/search', () => {
    it('should perform advanced search', async () => {
      const mockResult = {
        data: [
          {
            id: 1,
            userId: 1,
            uploadId: 'upload-1',
            rowIndex: 0,
            data: { symbol: 'AAPL', price: 150.00 }
          }
        ],
        totalCount: 1,
        page: 1,
        limit: 100
      };

      mockDataQueryService.getUserData.mockResolvedValue(mockResult);
      mockDataQueryService.transformDataForFrontend.mockReturnValue([
        {
          id: 1,
          uploadId: 'upload-1',
          rowIndex: 0,
          symbol: 'AAPL',
          price: 150.00
        }
      ]);

      const response = await request(app)
        .post('/api/data/search')
        .send({
          query: 'AAPL',
          columns: ['symbol'],
          page: 1,
          limit: 100
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.searchQuery).toBe('AAPL');
      expect(response.body.data.searchColumns).toEqual(['symbol']);
    });

    it('should validate search query', async () => {
      const response = await request(app)
        .post('/api/data/search')
        .send({
          columns: ['symbol']
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_SEARCH_QUERY');
    });
  });
});