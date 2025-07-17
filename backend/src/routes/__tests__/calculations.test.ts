import request from 'supertest';
import express from 'express';
import calculationRoutes from '../calculations';
import { database } from '../../database';

// Mock the database
jest.mock('../../database', () => ({
  database: {
    run: jest.fn(),
    get: jest.fn(),
    all: jest.fn()
  }
}));

// Mock the DataStorageService
jest.mock('../../services/DataStorageService', () => ({
  DataStorageService: {
    getUploadMetadata: jest.fn(),
    getDataRows: jest.fn()
  }
}));

// Mock the auth middleware
jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { id: 1, email: 'test@example.com' };
    next();
  }
}));

import { DataStorageService } from '../../services/DataStorageService';

describe('Calculations API', () => {
  let app: express.Application;
  let authToken: string;
  let mockUpload: any;

  beforeEach(() => {
    // Create test app
    app = express();
    app.use(express.json());
    app.use('/api/calculations', calculationRoutes);

    // Mock user and auth token
    authToken = 'mock-jwt-token';
    mockUpload = {
      id: 'upload-123',
      userId: 1,
      filename: 'test.csv',
      rowCount: 100,
      columnNames: ['price', 'quantity', 'volume'],
      uploadedAt: new Date()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/calculations/validate', () => {
    it('should validate a correct formula', async () => {
      (DataStorageService.getUploadMetadata as jest.Mock).mockResolvedValue(mockUpload);

      const response = await request(app)
        .post('/api/calculations/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          formula: 'price * quantity',
          uploadId: 'upload-123'
        });

      expect(response.status).toBe(200);
      expect(response.body.isValid).toBe(true);
      expect(response.body.errors).toHaveLength(0);
    });

    it('should reject formula with non-existent columns', async () => {
      (DataStorageService.getUploadMetadata as jest.Mock).mockResolvedValue(mockUpload);

      const response = await request(app)
        .post('/api/calculations/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          formula: 'price * invalid_column',
          uploadId: 'upload-123'
        });

      expect(response.status).toBe(200);
      expect(response.body.isValid).toBe(false);
      expect(response.body.errors).toContain("Column 'invalid_column' not found in dataset");
    });

    it('should return 404 for non-existent upload', async () => {
      (DataStorageService.getUploadMetadata as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/calculations/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          formula: 'price * quantity',
          uploadId: 'non-existent'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Upload not found');
    });

    it('should return 400 for missing parameters', async () => {
      const response = await request(app)
        .post('/api/calculations/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          formula: 'price * quantity'
          // missing uploadId
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Formula and uploadId are required');
    });
  });

  describe('POST /api/calculations/preview', () => {
    it('should generate preview for valid formula', async () => {
      const mockDataRows = {
        rows: [
          { id: 1, userId: 1, uploadId: 'upload-123', rowIndex: 0, data: { price: 10, quantity: 5, volume: 50 } },
          { id: 2, userId: 1, uploadId: 'upload-123', rowIndex: 1, data: { price: 20, quantity: 3, volume: 60 } }
        ]
      };

      (DataStorageService.getUploadMetadata as jest.Mock).mockResolvedValue(mockUpload);
      (DataStorageService.getDataRows as jest.Mock).mockResolvedValue(mockDataRows);

      const response = await request(app)
        .post('/api/calculations/preview')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          formula: 'price * quantity',
          uploadId: 'upload-123'
        });

      expect(response.status).toBe(200);
      expect(response.body.formula).toBe('price * quantity');
      expect(response.body.previewValues).toEqual([50, 60]);
      expect(response.body.errors).toHaveLength(0);
    });

    it('should return 404 for non-existent upload', async () => {
      (DataStorageService.getUploadMetadata as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/calculations/preview')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          formula: 'price * quantity',
          uploadId: 'non-existent'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Upload not found');
    });
  });

  describe('POST /api/calculations/columns', () => {
    it('should save calculated column', async () => {
      (DataStorageService.getUploadMetadata as jest.Mock).mockResolvedValue(mockUpload);
      (database.run as jest.Mock).mockResolvedValue({ lastID: 1 });
      (database.get as jest.Mock).mockResolvedValue({
        id: 1,
        user_id: 1,
        upload_id: 'upload-123',
        column_name: 'total_value',
        formula: 'price * quantity',
        created_at: '2023-01-01T00:00:00.000Z'
      });

      const response = await request(app)
        .post('/api/calculations/columns')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          columnName: 'total_value',
          formula: 'price * quantity',
          uploadId: 'upload-123'
        });

      expect(response.status).toBe(201);
      expect(response.body.columnName).toBe('total_value');
      expect(response.body.formula).toBe('price * quantity');
    });

    it('should reject invalid formula', async () => {
      (DataStorageService.getUploadMetadata as jest.Mock).mockResolvedValue(mockUpload);

      const response = await request(app)
        .post('/api/calculations/columns')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          columnName: 'invalid_calc',
          formula: 'price * invalid_column',
          uploadId: 'upload-123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid formula');
      expect(response.body.details).toContain("Column 'invalid_column' not found in dataset");
    });

    it('should return 400 for missing parameters', async () => {
      const response = await request(app)
        .post('/api/calculations/columns')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          columnName: 'total_value',
          formula: 'price * quantity'
          // missing uploadId
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Column name, formula, and uploadId are required');
    });
  });

  describe('GET /api/calculations/columns/:uploadId', () => {
    it('should retrieve calculated columns', async () => {
      const mockColumns = [
        {
          id: 1,
          user_id: 1,
          upload_id: 'upload-123',
          column_name: 'total_value',
          formula: 'price * quantity',
          created_at: '2023-01-01T00:00:00.000Z'
        }
      ];

      (DataStorageService.getUploadMetadata as jest.Mock).mockResolvedValue(mockUpload);
      (database.all as jest.Mock).mockResolvedValue(mockColumns);

      const response = await request(app)
        .get('/api/calculations/columns/upload-123')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].columnName).toBe('total_value');
    });

    it('should return 404 for non-existent upload', async () => {
      (DataStorageService.getUploadMetadata as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/calculations/columns/non-existent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Upload not found');
    });
  });

  describe('DELETE /api/calculations/columns/:columnId', () => {
    it('should delete calculated column', async () => {
      (database.run as jest.Mock).mockResolvedValue({ changes: 1 });

      const response = await request(app)
        .delete('/api/calculations/columns/1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(204);
    });

    it('should return 404 for non-existent column', async () => {
      (database.run as jest.Mock).mockResolvedValue({ changes: 0 });

      const response = await request(app)
        .delete('/api/calculations/columns/999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid column ID', async () => {
      const response = await request(app)
        .delete('/api/calculations/columns/invalid')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid column ID');
    });
  });
});