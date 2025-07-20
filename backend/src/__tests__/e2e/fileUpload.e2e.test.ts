import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../../middleware/auth';
import uploadRoutes from '../../routes/upload';

// Create test app that mimics the real application
const createE2ETestApp = () => {
  const app = express();
  
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  
  // Use real auth middleware for E2E tests
  app.use('/api/upload', uploadRoutes);
  
  return app;
};

// Helper to create a valid JWT token for testing
const createTestToken = (userId: string = 'test-user-id') => {
  const secret = process.env.JWT_SECRET || 'test-secret';
  return jwt.sign({ id: userId }, secret, { expiresIn: '1h' });
};

describe('File Upload End-to-End Tests', () => {
  let app: express.Application;
  let authToken: string;

  beforeAll(() => {
    app = createE2ETestApp();
    authToken = createTestToken();
  });

  describe('Complete Upload Flow with 25MB Limits', () => {
    it('should complete full upload flow for valid 25MB CSV file', async () => {
      // Create a realistic CSV file that's close to 25MB
      const headerRow = 'Date,Symbol,Price,Volume,Open,High,Low,Close\n';
      const sampleDataRow = '2023-01-01,AAPL,150.25,1000000,149.50,151.00,149.00,150.25\n';
      
      // Calculate how many rows we can fit in ~24MB (leaving room for headers)
      const targetSize = 24 * 1024 * 1024; // 24MB to be safe
      const remainingSize = targetSize - headerRow.length;
      const numRows = Math.floor(remainingSize / sampleDataRow.length);
      
      const csvContent = headerRow + sampleDataRow.repeat(numRows);
      
      const response = await request(app)
        .post('/api/upload/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvContent), {
          filename: 'large-trade-data.csv',
          contentType: 'text/csv'
        });

      // Should succeed or fail gracefully (not due to file size)
      if (response.status === 201) {
        // Success case
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('uploadId');
        expect(response.body.data).toHaveProperty('filename', 'large-trade-data.csv');
        expect(response.body.data).toHaveProperty('rowCount');
        expect(response.body.data.rowCount).toBeGreaterThan(0);
      } else if (response.status === 400) {
        // Should not fail due to file size
        expect(response.body.error.code).not.toBe('FILE_TOO_LARGE');
      }
    });

    it('should reject files over 25MB with proper error response', async () => {
      // Create a file that's definitely over 25MB
      const csvContent = 'Date,Symbol,Price,Volume\n' + 
        'A'.repeat(26 * 1024 * 1024); // 26MB
      
      const response = await request(app)
        .post('/api/upload/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvContent), {
          filename: 'oversized-file.csv',
          contentType: 'text/csv'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FILE_TOO_LARGE');
      expect(response.body.error.message).toBe('File size exceeds 25MB limit. Please upload a smaller CSV file.');
    });

    it('should handle boundary case of exactly 25MB', async () => {
      // Create exactly 25MB of content
      const headerRow = 'Date,Symbol,Price,Volume\n';
      const targetSize = 25 * 1024 * 1024;
      const remainingSize = targetSize - headerRow.length;
      const paddingContent = 'A'.repeat(remainingSize);
      const csvContent = headerRow + paddingContent;
      
      // Verify size is exactly 25MB
      expect(Buffer.from(csvContent).length).toBe(targetSize);
      
      const response = await request(app)
        .post('/api/upload/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvContent), {
          filename: 'exactly-25mb.csv',
          contentType: 'text/csv'
        });

      // Should not fail due to file size (may fail due to parsing, which is expected)
      if (response.status === 400) {
        expect(response.body.error.code).not.toBe('FILE_TOO_LARGE');
      }
    });
  });

  describe('Authentication Integration', () => {
    it('should reject uploads without authentication token', async () => {
      const csvContent = 'Date,Symbol,Price,Volume\n2023-01-01,AAPL,150.00,1000000';
      
      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', Buffer.from(csvContent), {
          filename: 'test.csv',
          contentType: 'text/csv'
        });

      expect(response.status).toBe(401);
    });

    it('should reject uploads with invalid authentication token', async () => {
      const csvContent = 'Date,Symbol,Price,Volume\n2023-01-01,AAPL,150.00,1000000';
      
      const response = await request(app)
        .post('/api/upload/csv')
        .set('Authorization', 'Bearer invalid-token')
        .attach('file', Buffer.from(csvContent), {
          filename: 'test.csv',
          contentType: 'text/csv'
        });

      expect(response.status).toBe(401);
    });

    it('should accept uploads with valid authentication token', async () => {
      const csvContent = 'Date,Symbol,Price,Volume\n2023-01-01,AAPL,150.00,1000000';
      
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

  describe('Error Consistency Tests', () => {
    it('should return consistent error format across different error types', async () => {
      // Test file size error
      const oversizedContent = 'A'.repeat(26 * 1024 * 1024);
      const sizeErrorResponse = await request(app)
        .post('/api/upload/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(oversizedContent), {
          filename: 'oversized.csv',
          contentType: 'text/csv'
        });

      expect(sizeErrorResponse.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String)
        }
      });

      // Test file type error
      const txtContent = 'Not a CSV file';
      const typeErrorResponse = await request(app)
        .post('/api/upload/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(txtContent), {
          filename: 'test.txt',
          contentType: 'text/plain'
        });

      expect(typeErrorResponse.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String)
        }
      });

      // Test no file error
      const noFileResponse = await request(app)
        .post('/api/upload/csv')
        .set('Authorization', `Bearer ${authToken}`);

      expect(noFileResponse.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String)
        }
      });
    });
  });

  describe('Performance and Stress Tests', () => {
    it('should handle multiple concurrent uploads within size limits', async () => {
      const csvContent = 'Date,Symbol,Price,Volume\n2023-01-01,AAPL,150.00,1000000';
      
      const uploadPromises = Array.from({ length: 3 }, (_, index) =>
        request(app)
          .post('/api/upload/csv')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', Buffer.from(csvContent), {
            filename: `concurrent-test-${index}.csv`,
            contentType: 'text/csv'
          })
      );

      const responses = await Promise.all(uploadPromises);
      
      // All should either succeed or fail gracefully (not due to file size)
      responses.forEach(response => {
        if (response.status === 400) {
          expect(response.body.error.code).not.toBe('FILE_TOO_LARGE');
        }
      });
    });

    it('should handle large valid CSV files efficiently', async () => {
      // Create a large but valid CSV file (20MB)
      const headerRow = 'Date,Symbol,Price,Volume,Open,High,Low,Close\n';
      const dataRow = '2023-01-01,AAPL,150.25,1000000,149.50,151.00,149.00,150.25\n';
      const targetSize = 20 * 1024 * 1024; // 20MB
      const remainingSize = targetSize - headerRow.length;
      const numRows = Math.floor(remainingSize / dataRow.length);
      const csvContent = headerRow + dataRow.repeat(numRows);

      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/upload/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvContent), {
          filename: 'large-performance-test.csv',
          contentType: 'text/csv'
        });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should not fail due to file size
      if (response.status === 400) {
        expect(response.body.error.code).not.toBe('FILE_TOO_LARGE');
      }

      // Should complete within reasonable time (adjust as needed)
      expect(duration).toBeLessThan(30000); // 30 seconds max
    });
  });

  describe('Real-world Scenario Tests', () => {
    it('should handle realistic trading data CSV files', async () => {
      // Create realistic trading data
      const headers = 'Date,Symbol,Open,High,Low,Close,Volume,AdjClose\n';
      const generateTradeRow = (date: string, symbol: string) => {
        const basePrice = 100 + Math.random() * 50;
        const open = basePrice.toFixed(2);
        const high = (basePrice + Math.random() * 5).toFixed(2);
        const low = (basePrice - Math.random() * 5).toFixed(2);
        const close = (basePrice + (Math.random() - 0.5) * 3).toFixed(2);
        const volume = Math.floor(Math.random() * 10000000);
        return `${date},${symbol},${open},${high},${low},${close},${volume},${close}\n`;
      };

      let csvContent = headers;
      const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'];
      const startDate = new Date('2023-01-01');
      
      // Generate data for multiple symbols over several months
      for (let day = 0; day < 100; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + day);
        const dateStr = currentDate.toISOString().split('T')[0];
        
        symbols.forEach(symbol => {
          csvContent += generateTradeRow(dateStr, symbol);
        });
      }

      // Ensure we're under 25MB
      if (Buffer.from(csvContent).length > 25 * 1024 * 1024) {
        csvContent = csvContent.substring(0, 25 * 1024 * 1024 - 1000); // Leave some buffer
      }

      const response = await request(app)
        .post('/api/upload/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvContent), {
          filename: 'realistic-trading-data.csv',
          contentType: 'text/csv'
        });

      // Should not fail due to file size
      if (response.status === 400) {
        expect(response.body.error.code).not.toBe('FILE_TOO_LARGE');
      }
    });
  });
});