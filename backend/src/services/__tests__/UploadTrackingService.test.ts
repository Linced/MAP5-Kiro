import { UploadTrackingService } from '../UploadTrackingService';
import { database } from '../../database';

// Mock the database
jest.mock('../../database', () => ({
  database: {
    get: jest.fn(),
    all: jest.fn()
  }
}));

describe('UploadTrackingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the progress map
    (UploadTrackingService as any).progressMap.clear();
  });

  describe('progress tracking', () => {
    it('should initialize upload tracking', () => {
      UploadTrackingService.initializeUpload('test-id');
      
      const progress = UploadTrackingService.getProgress('test-id');
      
      expect(progress).toEqual({
        uploadId: 'test-id',
        status: 'pending',
        progress: 0,
        message: 'Upload initialized'
      });
    });

    it('should update progress', () => {
      UploadTrackingService.initializeUpload('test-id');
      UploadTrackingService.updateProgress('test-id', 50, 'processing', 'Halfway done');
      
      const progress = UploadTrackingService.getProgress('test-id');
      
      expect(progress?.progress).toBe(50);
      expect(progress?.status).toBe('processing');
      expect(progress?.message).toBe('Halfway done');
    });

    it('should cap progress at 100', () => {
      UploadTrackingService.initializeUpload('test-id');
      UploadTrackingService.updateProgress('test-id', 150, 'processing');
      
      const progress = UploadTrackingService.getProgress('test-id');
      
      expect(progress?.progress).toBe(100);
    });

    it('should not allow negative progress', () => {
      UploadTrackingService.initializeUpload('test-id');
      UploadTrackingService.updateProgress('test-id', -10, 'processing');
      
      const progress = UploadTrackingService.getProgress('test-id');
      
      expect(progress?.progress).toBe(0);
    });

    it('should mark upload as failed', () => {
      UploadTrackingService.initializeUpload('test-id');
      UploadTrackingService.markAsFailed('test-id', 'Something went wrong');
      
      const progress = UploadTrackingService.getProgress('test-id');
      
      expect(progress?.status).toBe('failed');
      expect(progress?.error).toBe('Something went wrong');
      expect(progress?.message).toBe('Upload failed');
    });

    it('should mark upload as completed', () => {
      UploadTrackingService.initializeUpload('test-id');
      UploadTrackingService.markAsCompleted('test-id', 100);
      
      const progress = UploadTrackingService.getProgress('test-id');
      
      expect(progress?.status).toBe('completed');
      expect(progress?.progress).toBe(100);
      expect(progress?.message).toBe('Successfully processed 100 rows');
    });

    it('should cleanup tracking data', () => {
      UploadTrackingService.initializeUpload('test-id');
      UploadTrackingService.cleanup('test-id');
      
      const progress = UploadTrackingService.getProgress('test-id');
      
      expect(progress).toBeNull();
    });
  });

  describe('getUserUploadStats', () => {
    it('should return upload statistics', async () => {
      const mockStats = {
        total_uploads: 10,
        total_rows: 1000,
        avg_rows: 100,
        last_upload: '2023-01-01T00:00:00.000Z'
      };

      (database.get as jest.Mock).mockResolvedValueOnce(mockStats);

      const result = await UploadTrackingService.getUserUploadStats(1);

      expect(result).toEqual({
        totalUploads: 10,
        successfulUploads: 10,
        failedUploads: 0,
        totalRowsProcessed: 1000,
        averageFileSize: 100,
        lastUploadDate: new Date('2023-01-01T00:00:00.000Z')
      });
    });

    it('should handle null values', async () => {
      const mockStats = {
        total_uploads: null,
        total_rows: null,
        avg_rows: null,
        last_upload: null
      };

      (database.get as jest.Mock).mockResolvedValueOnce(mockStats);

      const result = await UploadTrackingService.getUserUploadStats(1);

      expect(result).toEqual({
        totalUploads: 0,
        successfulUploads: 0,
        failedUploads: 0,
        totalRowsProcessed: 0,
        averageFileSize: 0,
        lastUploadDate: null
      });
    });
  });

  describe('checkUploadLimits', () => {
    it('should allow upload within limits', async () => {
      // Mock today's stats - within limits
      (database.get as jest.Mock)
        .mockResolvedValueOnce({ uploads_today: 5, rows_today: 500 }) // Today's stats
        .mockResolvedValueOnce({ total_rows: 5000 }); // Total stats

      const result = await UploadTrackingService.checkUploadLimits(1);

      expect(result.canUpload).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.limits.currentUploadsToday).toBe(5);
      expect(result.limits.currentTotalRows).toBe(5000);
    });

    it('should reject upload when daily limit exceeded', async () => {
      // Mock today's stats - daily limit exceeded
      (database.get as jest.Mock)
        .mockResolvedValueOnce({ uploads_today: 10, rows_today: 500 }) // Today's stats
        .mockResolvedValueOnce({ total_rows: 5000 }); // Total stats

      const result = await UploadTrackingService.checkUploadLimits(1);

      expect(result.canUpload).toBe(false);
      expect(result.reason).toBe('Daily upload limit of 10 files reached');
    });

    it('should reject upload when total row limit exceeded', async () => {
      // Mock stats - total row limit exceeded
      (database.get as jest.Mock)
        .mockResolvedValueOnce({ uploads_today: 5, rows_today: 500 }) // Today's stats
        .mockResolvedValueOnce({ total_rows: 50000 }); // Total stats

      const result = await UploadTrackingService.checkUploadLimits(1);

      expect(result.canUpload).toBe(false);
      expect(result.reason).toBe('Total row limit of 50000 rows reached');
    });

    it('should handle null database values', async () => {
      // Mock null stats
      (database.get as jest.Mock)
        .mockResolvedValueOnce({ uploads_today: null, rows_today: null })
        .mockResolvedValueOnce({ total_rows: null });

      const result = await UploadTrackingService.checkUploadLimits(1);

      expect(result.canUpload).toBe(true);
      expect(result.limits.currentUploadsToday).toBe(0);
      expect(result.limits.currentTotalRows).toBe(0);
    });
  });

  describe('getRecentActivity', () => {
    it('should return recent uploads', async () => {
      const mockUploads = [
        {
          id: 'upload1',
          filename: 'file1.csv',
          row_count: 100,
          uploaded_at: '2023-01-01T00:00:00.000Z',
          column_names: '["A","B"]'
        },
        {
          id: 'upload2',
          filename: 'file2.csv',
          row_count: 200,
          uploaded_at: '2023-01-02T00:00:00.000Z',
          column_names: '["X","Y"]'
        }
      ];

      (database.all as jest.Mock).mockResolvedValueOnce(mockUploads);

      const result = await UploadTrackingService.getRecentActivity(1, 5);

      expect(result).toHaveLength(2);
      expect(result[0].filename).toBe('file1.csv');
      expect(result[0].columnNames).toEqual(['A', 'B']);
      expect(result[1].filename).toBe('file2.csv');
      expect(result[1].columnNames).toEqual(['X', 'Y']);
    });
  });
});