/**
 * End-to-End Tests for 25MB File Upload Limit
 * 
 * This test suite specifically verifies that the 25MB file size limit
 * works correctly across the entire system from frontend to backend.
 */

import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import uploadRoutes from '../../routes/upload';

// Create test app that mimics the real application
const createTestApp = () => {
  const app = express();
  
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  
  // Use real upload routes for E2E tests
  app.use('/api/upload', uploadRoutes);
  
  return app;
};

// Helper to create a valid JWT token for testing
const createTestToken = (userId: string = 'test-user-id') => {
  const secret = process.env.JWT_SECRET || 'test-secret';
  return jwt.sign({ id: userId }, secret, { expiresIn: '1h' });
};

// Helper to create CSV content of specific size
const createCSVContent = (targetSizeBytes: number): string => {
  const headerRow = 'Date,Symbol,Price,Volume,Open,High,Low,Close\n';
  const sampleDataRow = '2023-01-01,AAPL,150.25,1000000,149.50,151.00,149.00,150.25\n';
  
  if (targetSizeBytes <= headerRow.length) {
    return headerRow.substring(0, targetSizeBytes);
  }
  
  const remainingSize = targetSizeBytes - headerRow.length;
  const numRows = Math.floor(remainingSize / sampleDataRow.length);
  const extraBytes = remainingSize % sampleDataRow.length;
  
  let content = headerRow + sampleDataRow.repeat(numRows);
  
  // Add partial row if needed to reach exact size
  if (extraBytes > 0) {
    content += sampleDataRow.substring(0, extraBytes);
  }
  
  return content;
};

describe('25MB File Upload Limit End-to-End Tests', () => {
  let app: express.Application;
  let authToken: string;

  beforeAll(() => {
    app = createTestApp();
    authToken = createTestToken();
  });

  describe('File Size Boundary Tests', () => {
    it('should accept files up to 25MB successfully', async () => {
      // Create a file that's exactly 25MB
      const targetSize = 25 * 1024 * 1024; // 25MB
      const csvContent = createCSVContent(targetSize);
      
      // Verify the content is exactly 25MB
      expect(Buffer.from(csvContent).length).toBe(targetSize);
      
      const response = await request(app)
        .post('/api/upload/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvContent), {
          filename: 'test-25mb-exact.csv',
          contentType: 'text/csv'
        });

      // Should not fail due to file size
      if (response.status === 400) {
        expect(response.body.error.code).not.toBe('FILE_TOO_LARGE');
      } else {
        // If successful, verify the response structure
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('uploadId');
        expect(response.body.data).toHaveProperty('filename', 'test-25mb-exact.csv');
      }
    });

    it('should accept files just under 25MB', async () => {
      // Create a file that's 1 byte under 25MB
      const targetSize = (25 * 1024 * 1024) - 1; // 25MB - 1 byte
      const csvContent = createCSVContent(targetSize);
      
      // Verify the content is exactly 25MB - 1 byte
      expect(Buffer.from(csvContent).length).toBe(targetSize);
      
      const response = await request(app)
        .post('/api/upload/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvContent), {
          filename: 'test-under-25mb.csv',
          contentType: 'text/csv'
        });

      // Should not fail due to file size
      if (response.status === 400) {
        expect(response.body.error.code).not.toBe('FILE_TOO_LARGE');
      } else {
        // If successful, verify the response structure
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('uploadId');
        expect(response.body.data).toHaveProperty('filename', 'test-under-25mb.csv');
      }
    });

    it('should reject files over 25MB with proper error message', async () => {
      // Create a file that's 1 byte over 25MB
      const targetSize = (25 * 1024 * 1024) + 1; // 25MB + 1 byte
      const csvContent = createCSVContent(targetSize);
      
      // Verify the content is exactly 25MB + 1 byte
      expect(Buffer.from(csvContent).length).toBe(targetSize);
      
      const response = await request(app)
        .post('/api/upload/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvContent), {
          filename: 'test-over-25mb.csv',
          contentType: 'text/csv'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FILE_TOO_LARGE');
      expect(response.body.error.message).toBe('File size exceeds 25MB limit. Please upload a smaller CSV file.');
    });

    it('should reject significantly larger files', async () => {
      // Create a file that's 30MB
      const targetSize = 30 * 1024 * 1024; // 30MB
      const csvContent = createCSVContent(targetSize);
      
      // Verify the content is exactly 30MB
      expect(Buffer.from(csvContent).length).toBe(targetSize);
      
      const response = await request(app)
        .post('/api/upload/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvContent), {
          filename: 'test-30mb.csv',
          contentType: 'text/csv'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FILE_TOO_LARGE');
      expect(response.body.error.message).toBe('File size exceeds 25MB limit. Please upload a smaller CSV file.');
    });
  });

  describe('Realistic File Size Tests', () => {
    it('should handle realistic large CSV files (20MB)', async () => {
      // Create a realistic 20MB CSV file with trading data
      const headerRow = 'Date,Symbol,Open,High,Low,Close,Volume,AdjClose\n';
      const generateTradeRow = (date: string, symbol: string) => {
        const basePrice = 100 + Math.random() * 50;
        const open = basePrice.toFixed(2);
        const high = (basePrice + Math.random() * 5).toFixed(2);
        const low = (basePrice - Math.random() * 5).toFixed(2);
        const close = (basePrice + (Math.random() - 0.5) * 3).toFixed(2);
        const volume = Math.floor(Math.random() * 10000000);
        return `${date},${symbol},${open},${high},${low},${close},${volume},${close}\n`;
      };

      let csvContent = headerRow;
      const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'];
      const startDate = new Date('2023-01-01');
      
      // Generate data until we reach approximately 20MB
      const targetSize = 20 * 1024 * 1024; // 20MB
      let currentSize = csvContent.length;
      let dayCounter = 0;
      
      while (currentSize < targetSize) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + dayCounter);
        const dateStr = currentDate.toISOString().split('T')[0];
        
        for (const symbol of symbols) {
          const row = generateTradeRow(dateStr, symbol);
          if (currentSize + row.length > targetSize) break;
          csvContent += row;
          currentSize += row.length;
        }
        
        dayCounter++;
        if (dayCounter > 1000) break; // Safety break
      }

      const response = await request(app)
        .post('/api/upload/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvContent), {
          filename: 'realistic-20mb-trading-data.csv',
          contentType: 'text/csv'
        });

      // Should not fail due to file size
      if (response.status === 400) {
        expect(response.body.error.code).not.toBe('FILE_TOO_LARGE');
      } else {
        // If successful, verify the response structure
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('uploadId');
        expect(response.body.data).toHaveProperty('filename', 'realistic-20mb-trading-data.csv');
        expect(response.body.data).toHaveProperty('rowCount');
        expect(response.body.data.rowCount).toBeGreaterThan(0);
      }
    });

    it('should handle medium-sized CSV files (10MB)', async () => {
      // Create a 10MB CSV file
      const targetSize = 10 * 1024 * 1024; // 10MB
      const csvContent = createCSVContent(targetSize);
      
      const response = await request(app)
        .post('/api/upload/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvContent), {
          filename: 'test-10mb.csv',
          contentType: 'text/csv'
        });

      // Should not fail due to file size
      if (response.status === 400) {
        expect(response.body.error.code).not.toBe('FILE_TOO_LARGE');
      } else {
        // If successful, verify the response structure
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('uploadId');
        expect(response.body.data).toHaveProperty('filename', 'test-10mb.csv');
      }
    });

    it('should handle small CSV files (1MB)', async () => {
      // Create a 1MB CSV file
      const targetSize = 1024 * 1024; // 1MB
      const csvContent = createCSVContent(targetSize);
      
      const response = await request(app)
        .post('/api/upload/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvContent), {
          filename: 'test-1mb.csv',
          contentType: 'text/csv'
        });

      // Should not fail due to file size
      if (response.status === 400) {
        expect(response.body.error.code).not.toBe('FILE_TOO_LARGE');
      } else {
        // If successful, verify the response structure
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('uploadId');
        expect(response.body.data).toHaveProperty('filename', 'test-1mb.csv');
      }
    });
  });

  describe('Error Response Consistency', () => {
    it('should return consistent error format for file size violations', async () => {
      const testSizes = [
        { size: (25 * 1024 * 1024) + 1, description: '25MB + 1 byte' },
        { size: (25 * 1024 * 1024) + 1024, description: '25MB + 1KB' },
        { size: 30 * 1024 * 1024, description: '30MB' },
        { size: 50 * 1024 * 1024, description: '50MB' }
      ];

      for (const { size, description } of testSizes) {
        const csvContent = createCSVContent(size);
        
        const response = await request(app)
          .post('/api/upload/csv')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', Buffer.from(csvContent), {
            filename: `test-${description.replace(/\s+/g, '-')}.csv`,
            contentType: 'text/csv'
          });

        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'File size exceeds 25MB limit. Please upload a smaller CSV file.'
          }
        });
      }
    });

    it('should have different error codes for different error types', async () => {
      // Test file size error
      const oversizedContent = createCSVContent((25 * 1024 * 1024) + 1);
      const sizeErrorResponse = await request(app)
        .post('/api/upload/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(oversizedContent), {
          filename: 'oversized.csv',
          contentType: 'text/csv'
        });

      expect(sizeErrorResponse.body.error.code).toBe('FILE_TOO_LARGE');

      // Test file type error
      const txtContent = 'Not a CSV file';
      const typeErrorResponse = await request(app)
        .post('/api/upload/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(txtContent), {
          filename: 'test.txt',
          contentType: 'text/plain'
        });

      expect(typeErrorResponse.body.error.code).toBe('INVALID_FILE_TYPE');

      // Test no file error
      const noFileResponse = await request(app)
        .post('/api/upload/csv')
        .set('Authorization', `Bearer ${authToken}`);

      expect(noFileResponse.body.error.code).toBe('NO_FILE');

      // Verify all errors have consistent structure
      [sizeErrorResponse, typeErrorResponse, noFileResponse].forEach(response => {
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: expect.any(String),
            message: expect.any(String)
          }
        });
      });
    });
  });

  describe('Authentication Integration', () => {
    it('should enforce authentication for file uploads', async () => {
      const csvContent = createCSVContent(1024); // 1KB file
      
      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', Buffer.from(csvContent), {
          filename: 'test.csv',
          contentType: 'text/csv'
        });

      expect(response.status).toBe(401);
    });

    it('should reject invalid authentication tokens', async () => {
      const csvContent = createCSVContent(1024); // 1KB file
      
      const response = await request(app)
        .post('/api/upload/csv')
        .set('Authorization', 'Bearer invalid-token')
        .attach('file', Buffer.from(csvContent), {
          filename: 'test.csv',
          contentType: 'text/csv'
        });

      expect(response.status).toBe(401);
    });

    it('should accept valid authentication tokens with proper file sizes', async () => {
      const csvContent = createCSVContent(1024); // 1KB file
      
      const response = await request(app)
        .post('/api/upload/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvContent), {
          filename: 'test.csv',
          contentType: 'text/csv'
        });

      // Should not fail due to authentication
      expect(response.status).not.toBe(401);
    });
  });

  describe('Performance Considerations', () => {
    it('should handle large files within reasonable time', async () => {
      // Create a 24MB file (just under the limit)
      const targetSize = 24 * 1024 * 1024; // 24MB
      const csvContent = createCSVContent(targetSize);
      
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/upload/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvContent), {
          filename: 'performance-test-24mb.csv',
          contentType: 'text/csv'
        });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should not fail due to file size
      if (response.status === 400) {
        expect(response.body.error.code).not.toBe('FILE_TOO_LARGE');
      }

      // Should complete within reasonable time (adjust as needed for your system)
      expect(duration).toBeLessThan(60000); // 60 seconds max
    });

    it('should handle multiple file size validations efficiently', async () => {
      const testFiles = [
        { size: 1024 * 1024, name: 'test-1mb.csv' }, // 1MB
        { size: 5 * 1024 * 1024, name: 'test-5mb.csv' }, // 5MB
        { size: 10 * 1024 * 1024, name: 'test-10mb.csv' }, // 10MB
        { size: 20 * 1024 * 1024, name: 'test-20mb.csv' } // 20MB
      ];

      const startTime = Date.now();

      const uploadPromises = testFiles.map(({ size, name }) => {
        const csvContent = createCSVContent(size);
        return request(app)
          .post('/api/upload/csv')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', Buffer.from(csvContent), {
            filename: name,
            contentType: 'text/csv'
          });
      });

      const responses = await Promise.all(uploadPromises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All should either succeed or fail gracefully (not due to file size)
      responses.forEach((response, index) => {
        if (response.status === 400) {
          expect(response.body.error.code).not.toBe('FILE_TOO_LARGE');
        }
      });

      // Should complete all uploads within reasonable time
      expect(duration).toBeLessThan(120000); // 2 minutes max for all uploads
    });
  });
});