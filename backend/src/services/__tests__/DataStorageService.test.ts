import { DataStorageService } from '../DataStorageService';
import { database } from '../../database';

// Mock the database
jest.mock('../../database', () => ({
  database: {
    run: jest.fn(),
    get: jest.fn(),
    all: jest.fn()
  },
  QueryHelpers: {
    insert: jest.fn(),
    batchInsert: jest.fn()
  }
}));

describe('DataStorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('storeData', () => {
    it('should store CSV data successfully', async () => {
      const parsedData = {
        headers: ['Name', 'Age'],
        rows: [
          { Name: 'John', Age: '25' },
          { Name: 'Jane', Age: '30' }
        ]
      };

      // Mock successful database operations
      (database.run as jest.Mock)
        .mockResolvedValueOnce(undefined) // BEGIN TRANSACTION
        .mockResolvedValueOnce(undefined); // COMMIT

      const { QueryHelpers } = require('../../database');
      (QueryHelpers.insert as jest.Mock).mockResolvedValueOnce(undefined);
      (QueryHelpers.batchInsert as jest.Mock).mockResolvedValueOnce(undefined);

      const result = await DataStorageService.storeData(1, 'test.csv', parsedData);

      expect(result.rowCount).toBe(2);
      expect(result.uploadId).toBeDefined();
      expect(QueryHelpers.insert).toHaveBeenCalledWith('uploads', expect.objectContaining({
        user_id: 1,
        filename: 'test.csv',
        row_count: 2
      }));
      expect(QueryHelpers.batchInsert).toHaveBeenCalledWith('data_rows', expect.any(Array));
    });

    it('should rollback on error', async () => {
      const parsedData = {
        headers: ['Name'],
        rows: [{ Name: 'John' }]
      };

      // Mock database error
      (database.run as jest.Mock)
        .mockResolvedValueOnce(undefined) // BEGIN TRANSACTION
        .mockResolvedValueOnce(undefined); // ROLLBACK

      const { QueryHelpers } = require('../../database');
      (QueryHelpers.insert as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

      await expect(DataStorageService.storeData(1, 'test.csv', parsedData))
        .rejects.toThrow('Failed to store CSV data');

      expect(database.run).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('getUploadMetadata', () => {
    it('should return upload metadata', async () => {
      const mockUpload = {
        id: 'test-id',
        user_id: 1,
        filename: 'test.csv',
        row_count: 10,
        column_names: '["Name","Age"]',
        uploaded_at: '2023-01-01T00:00:00.000Z'
      };

      (database.get as jest.Mock).mockResolvedValueOnce(mockUpload);

      const result = await DataStorageService.getUploadMetadata('test-id', 1);

      expect(result).toEqual({
        id: 'test-id',
        userId: 1,
        filename: 'test.csv',
        rowCount: 10,
        columnNames: ['Name', 'Age'],
        uploadedAt: new Date('2023-01-01T00:00:00.000Z')
      });
    });

    it('should return null for non-existent upload', async () => {
      (database.get as jest.Mock).mockResolvedValueOnce(undefined);

      const result = await DataStorageService.getUploadMetadata('non-existent', 1);

      expect(result).toBeNull();
    });
  });

  describe('getUserUploads', () => {
    it('should return user uploads', async () => {
      const mockUploads = [
        {
          id: 'upload1',
          user_id: 1,
          filename: 'file1.csv',
          row_count: 5,
          column_names: '["A","B"]',
          uploaded_at: '2023-01-01T00:00:00.000Z'
        },
        {
          id: 'upload2',
          user_id: 1,
          filename: 'file2.csv',
          row_count: 10,
          column_names: '["X","Y"]',
          uploaded_at: '2023-01-02T00:00:00.000Z'
        }
      ];

      (database.all as jest.Mock).mockResolvedValueOnce(mockUploads);

      const result = await DataStorageService.getUserUploads(1, 10);

      expect(result).toHaveLength(2);
      expect(result[0].filename).toBe('file1.csv');
      expect(result[1].filename).toBe('file2.csv');
    });
  });

  describe('deleteUpload', () => {
    it('should delete upload successfully', async () => {
      // Mock upload exists
      (database.get as jest.Mock).mockResolvedValueOnce({ id: 'test-id' });
      
      // Mock successful deletions
      (database.run as jest.Mock)
        .mockResolvedValueOnce(undefined) // BEGIN TRANSACTION
        .mockResolvedValueOnce(undefined) // DELETE data_rows
        .mockResolvedValueOnce(undefined) // DELETE calculated_columns
        .mockResolvedValueOnce(undefined) // DELETE uploads
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await DataStorageService.deleteUpload('test-id', 1);

      expect(result).toBe(true);
      expect(database.run).toHaveBeenCalledWith('COMMIT');
    });

    it('should return false for non-existent upload', async () => {
      // Mock upload doesn't exist
      (database.get as jest.Mock).mockResolvedValueOnce(undefined);
      (database.run as jest.Mock)
        .mockResolvedValueOnce(undefined) // BEGIN TRANSACTION
        .mockResolvedValueOnce(undefined); // ROLLBACK

      const result = await DataStorageService.deleteUpload('non-existent', 1);

      expect(result).toBe(false);
      expect(database.run).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('getUserStorageStats', () => {
    it('should return storage statistics', async () => {
      const mockStats = {
        total_uploads: 5,
        total_rows: 100,
        last_upload: '2023-01-01T00:00:00.000Z'
      };

      (database.get as jest.Mock).mockResolvedValueOnce(mockStats);

      const result = await DataStorageService.getUserStorageStats(1);

      expect(result).toEqual({
        totalUploads: 5,
        totalRows: 100,
        lastUploadDate: new Date('2023-01-01T00:00:00.000Z')
      });
    });

    it('should handle null values', async () => {
      const mockStats = {
        total_uploads: null,
        total_rows: null,
        last_upload: null
      };

      (database.get as jest.Mock).mockResolvedValueOnce(mockStats);

      const result = await DataStorageService.getUserStorageStats(1);

      expect(result).toEqual({
        totalUploads: 0,
        totalRows: 0,
        lastUploadDate: null
      });
    });
  });
});