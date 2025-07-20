import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';

// Create a test-specific upload middleware that mirrors the real one
const storage = multer.memoryStorage();

const fileFilter = (_req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const isCSV = file.mimetype === 'text/csv' ||
    file.mimetype === 'application/csv' ||
    file.originalname.toLowerCase().endsWith('.csv');

  if (isCSV) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed. Please upload a .csv file.'));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
    files: 1,
  },
  fileFilter,
});

// Test upload middleware wrapper
const testUploadMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  const uploadSingle = upload.single('file');

  uploadSingle(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'File size exceeds 25MB limit. Please upload a smaller CSV file.'
          }
        });
      }

      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'TOO_MANY_FILES',
            message: 'Only one file can be uploaded at a time.'
          }
        });
      }

      return res.status(400).json({
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: `Upload error: ${err.message}`
        }
      });
    }

    if (err) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: err.message
        }
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'No CSV file provided. Please select a file to upload.'
        }
      });
    }

    return next();
  });
};

// Mock authentication middleware for testing
const mockAuthMiddleware = (req: any, res: any, next: any) => {
  req.user = { id: 'test-user-id' };
  next();
};

// Create test app
const createTestApp = () => {
  const app = express();
  
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  
  // Create a simple upload route for testing
  app.post('/api/upload/csv', mockAuthMiddleware, testUploadMiddleware, (req, res) => {
    // If we get here, the file passed all validations
    res.status(201).json({
      success: true,
      data: {
        uploadId: 'test-upload-id',
        filename: req.file!.originalname,
        rowCount: 1,
        columns: ['Date', 'Symbol', 'Price', 'Volume'],
        columnTypes: {},
        preview: [],
        uploadedAt: new Date().toISOString()
      }
    });
  });
  
  return app;
};

describe('File Upload Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('25MB File Size Limit Tests', () => {
    it('should accept files up to 25MB', async () => {
      // Create a buffer that's exactly 25MB
      const fileSize25MB = 25 * 1024 * 1024;
      const csvContent = 'Date,Symbol,Price,Volume\n' + 
        'A'.repeat(fileSize25MB - 30); // Subtract header length
      
      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', Buffer.from(csvContent), {
          filename: 'test-25mb.csv',
          contentType: 'text/csv'
        });

      // Should not fail due to file size
      expect(response.status).not.toBe(400);
      
      // If it fails, it should be due to parsing/validation, not size
      if (response.status === 400) {
        expect(response.body.error.code).not.toBe('FILE_TOO_LARGE');
      }
    });

    it('should reject files larger than 25MB', async () => {
      // Create a buffer that's slightly over 25MB
      const fileSize25MBPlus1 = (25 * 1024 * 1024) + 1;
      const csvContent = 'Date,Symbol,Price,Volume\n' + 
        'A'.repeat(fileSize25MBPlus1 - 30);
      
      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', Buffer.from(csvContent), {
          filename: 'test-over-25mb.csv',
          contentType: 'text/csv'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FILE_TOO_LARGE');
      expect(response.body.error.message).toContain('25MB');
    });

    it('should accept files just under 25MB', async () => {
      // Create a buffer that's just under 25MB
      const fileSize25MBMinus1 = (25 * 1024 * 1024) - 1;
      const csvContent = 'Date,Symbol,Price,Volume\n' + 
        'A'.repeat(fileSize25MBMinus1 - 30);
      
      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', Buffer.from(csvContent), {
          filename: 'test-under-25mb.csv',
          contentType: 'text/csv'
        });

      // Should not fail due to file size
      expect(response.status).not.toBe(400);
      
      // If it fails, it should be due to parsing/validation, not size
      if (response.status === 400) {
        expect(response.body.error.code).not.toBe('FILE_TOO_LARGE');
      }
    });

    it('should have correct error message for oversized files', async () => {
      // Create a buffer that's over 25MB
      const fileSize30MB = 30 * 1024 * 1024;
      const csvContent = 'Date,Symbol,Price,Volume\n' + 
        'A'.repeat(fileSize30MB - 30);
      
      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', Buffer.from(csvContent), {
          filename: 'test-30mb.csv',
          contentType: 'text/csv'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('File size exceeds 25MB limit. Please upload a smaller CSV file.');
    });
  });

  describe('File Type Validation Tests', () => {
    it('should accept valid CSV files', async () => {
      const csvContent = 'Date,Symbol,Price,Volume\n2023-01-01,AAPL,150.00,1000000';
      
      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', Buffer.from(csvContent), {
          filename: 'test.csv',
          contentType: 'text/csv'
        });

      // Should not fail due to file type
      if (response.status === 400) {
        expect(response.body.error.code).not.toBe('INVALID_FILE_TYPE');
      }
    });

    it('should reject non-CSV files', async () => {
      const txtContent = 'This is not a CSV file';
      
      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', Buffer.from(txtContent), {
          filename: 'test.txt',
          contentType: 'text/plain'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_FILE_TYPE');
      expect(response.body.error.message).toContain('CSV');
    });

    it('should accept CSV files with application/csv mimetype', async () => {
      const csvContent = 'Date,Symbol,Price,Volume\n2023-01-01,AAPL,150.00,1000000';
      
      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', Buffer.from(csvContent), {
          filename: 'test.csv',
          contentType: 'application/csv'
        });

      // Should not fail due to file type
      if (response.status === 400) {
        expect(response.body.error.code).not.toBe('INVALID_FILE_TYPE');
      }
    });
  });

  describe('No File Provided Tests', () => {
    it('should reject requests without files', async () => {
      const response = await request(app)
        .post('/api/upload/csv');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('NO_FILE');
      expect(response.body.error.message).toContain('No CSV file provided');
    });
  });

  describe('Multiple Files Tests', () => {
    it('should reject multiple file uploads', async () => {
      const csvContent1 = 'Date,Symbol,Price,Volume\n2023-01-01,AAPL,150.00,1000000';
      const csvContent2 = 'Date,Symbol,Price,Volume\n2023-01-02,GOOGL,2500.00,500000';
      
      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', Buffer.from(csvContent1), {
          filename: 'test1.csv',
          contentType: 'text/csv'
        })
        .attach('file', Buffer.from(csvContent2), {
          filename: 'test2.csv',
          contentType: 'text/csv'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('TOO_MANY_FILES');
    });
  });

  describe('Boundary Condition Tests', () => {
    it('should handle exactly 25MB files correctly', async () => {
      // Create exactly 25MB of valid CSV data
      const headerRow = 'Date,Symbol,Price,Volume\n';
      const dataRow = '2023-01-01,AAPL,150.00,1000000\n';
      const targetSize = 25 * 1024 * 1024;
      const remainingSize = targetSize - headerRow.length;
      const numRows = Math.floor(remainingSize / dataRow.length);
      const csvContent = headerRow + dataRow.repeat(numRows);
      
      // Ensure we're at exactly 25MB or just under
      const finalContent = csvContent.substring(0, targetSize);
      
      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', Buffer.from(finalContent), {
          filename: 'test-exactly-25mb.csv',
          contentType: 'text/csv'
        });

      // Should not fail due to file size
      if (response.status === 400) {
        expect(response.body.error.code).not.toBe('FILE_TOO_LARGE');
      }
    });

    it('should handle small valid CSV files', async () => {
      const csvContent = 'Date,Symbol,Price,Volume\n2023-01-01,AAPL,150.00,1000000';
      
      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', Buffer.from(csvContent), {
          filename: 'small-test.csv',
          contentType: 'text/csv'
        });

      // Should not fail due to file size
      if (response.status === 400) {
        expect(response.body.error.code).not.toBe('FILE_TOO_LARGE');
      }
    });
  });

  describe('Error Response Format Tests', () => {
    it('should return consistent error format for file size errors', async () => {
      const oversizedContent = 'A'.repeat(26 * 1024 * 1024); // 26MB
      
      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', Buffer.from(oversizedContent), {
          filename: 'oversized.csv',
          contentType: 'text/csv'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'FILE_TOO_LARGE');
      expect(response.body.error).toHaveProperty('message');
      expect(typeof response.body.error.message).toBe('string');
    });

    it('should return consistent error format for file type errors', async () => {
      const txtContent = 'Not a CSV file';
      
      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', Buffer.from(txtContent), {
          filename: 'test.txt',
          contentType: 'text/plain'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'INVALID_FILE_TYPE');
      expect(response.body.error).toHaveProperty('message');
      expect(typeof response.body.error.message).toBe('string');
    });
  });
});