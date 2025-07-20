/**
 * 25MB File Upload Integration Tests
 * 
 * This test suite specifically verifies that the 25MB file size limit
 * works correctly in the frontend component and integrates properly with the backend.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi } from 'vitest';
import { FileUpload } from '../FileUpload';
import { apiService } from '../../../services/api';

// Mock the API service
vi.mock('../../../services/api', () => ({
  apiService: {
    uploadFile: vi.fn(),
  },
}));

// Helper function to create mock files of specific sizes
const createMockFile = (name: string, size: number, type: string = 'text/csv'): File => {
  // Create content that matches the specified size
  const content = 'A'.repeat(size);
  const file = new File([content], name, { type });
  
  // Mock the size property since File constructor doesn't set it properly in tests
  Object.defineProperty(file, 'size', {
    value: size,
    writable: false,
  });
  
  return file;
};

// Helper to create realistic CSV content of specific size
const createRealisticCSVFile = (name: string, targetSize: number): File => {
  const headerRow = 'Date,Symbol,Open,High,Low,Close,Volume,AdjClose\n';
  const sampleDataRow = '2023-01-01,AAPL,150.25,1000000,149.50,151.00,149.00,150.25\n';
  
  let content = headerRow;
  const remainingSize = targetSize - headerRow.length;
  const numRows = Math.floor(remainingSize / sampleDataRow.length);
  const extraBytes = remainingSize % sampleDataRow.length;
  
  content += sampleDataRow.repeat(numRows);
  
  // Add partial row if needed to reach exact size
  if (extraBytes > 0) {
    content += sampleDataRow.substring(0, extraBytes);
  }
  
  const file = new File([content], name, { type: 'text/csv' });
  
  // Mock the size property
  Object.defineProperty(file, 'size', {
    value: targetSize,
    writable: false,
  });
  
  return file;
};

describe('25MB File Upload Integration Tests', () => {
  const mockOnUploadSuccess = vi.fn();
  const mockOnUploadError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Exact 25MB Boundary Tests', () => {
    it('should accept files exactly at 25MB limit', async () => {
      const mockApiUpload = vi.mocked(apiService.uploadFile);
      mockApiUpload.mockResolvedValue({
        success: true,
        data: {
          uploadId: 'test-upload-id',
          filename: 'test-exactly-25mb.csv',
          rowCount: 1000000,
          columns: ['Date', 'Symbol', 'Open', 'High', 'Low', 'Close', 'Volume', 'AdjClose'],
          columnTypes: {},
          preview: [],
          uploadedAt: new Date().toISOString()
        }
      });

      const { container } = render(
        <FileUpload
          onUploadSuccess={mockOnUploadSuccess}
          onUploadError={mockOnUploadError}
        />
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const fileExactly25MB = createRealisticCSVFile('test-exactly-25mb.csv', 25 * 1024 * 1024);

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [fileExactly25MB] } });
      });

      await waitFor(() => {
        expect(mockApiUpload).toHaveBeenCalledWith(fileExactly25MB, expect.any(Function));
      });

      await waitFor(() => {
        expect(mockOnUploadSuccess).toHaveBeenCalled();
      });

      expect(mockOnUploadError).not.toHaveBeenCalled();
    });

    it('should accept files 1 byte under 25MB limit', async () => {
      const mockApiUpload = vi.mocked(apiService.uploadFile);
      mockApiUpload.mockResolvedValue({
        success: true,
        data: {
          uploadId: 'test-upload-id',
          filename: 'test-under-25mb.csv',
          rowCount: 999999,
          columns: ['Date', 'Symbol', 'Price', 'Volume'],
          columnTypes: {},
          preview: [],
          uploadedAt: new Date().toISOString()
        }
      });

      const { container } = render(
        <FileUpload
          onUploadSuccess={mockOnUploadSuccess}
          onUploadError={mockOnUploadError}
        />
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const fileUnder25MB = createRealisticCSVFile('test-under-25mb.csv', (25 * 1024 * 1024) - 1);

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [fileUnder25MB] } });
      });

      await waitFor(() => {
        expect(mockApiUpload).toHaveBeenCalledWith(fileUnder25MB, expect.any(Function));
      });

      await waitFor(() => {
        expect(mockOnUploadSuccess).toHaveBeenCalled();
      });

      expect(mockOnUploadError).not.toHaveBeenCalled();
    });

    it('should reject files 1 byte over 25MB limit', async () => {
      const { container } = render(
        <FileUpload
          onUploadSuccess={mockOnUploadSuccess}
          onUploadError={mockOnUploadError}
        />
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const fileOver25MB = createRealisticCSVFile('test-over-25mb.csv', (25 * 1024 * 1024) + 1);

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [fileOver25MB] } });
      });

      await waitFor(() => {
        expect(screen.getByText('File size must be less than 25MB')).toBeInTheDocument();
      });

      expect(mockOnUploadError).toHaveBeenCalledWith('File size must be less than 25MB');
      expect(apiService.uploadFile).not.toHaveBeenCalled();
    });

    it('should reject files significantly over 25MB limit', async () => {
      const { container } = render(
        <FileUpload
          onUploadSuccess={mockOnUploadSuccess}
          onUploadError={mockOnUploadError}
        />
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file30MB = createRealisticCSVFile('test-30mb.csv', 30 * 1024 * 1024);

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file30MB] } });
      });

      await waitFor(() => {
        expect(screen.getByText('File size must be less than 25MB')).toBeInTheDocument();
      });

      expect(mockOnUploadError).toHaveBeenCalledWith('File size must be less than 25MB');
      expect(apiService.uploadFile).not.toHaveBeenCalled();
    });
  });

  describe('Realistic File Size Tests', () => {
    it('should handle large realistic CSV files (20MB)', async () => {
      const mockApiUpload = vi.mocked(apiService.uploadFile);
      mockApiUpload.mockResolvedValue({
        success: true,
        data: {
          uploadId: 'test-upload-id',
          filename: 'large-trading-data.csv',
          rowCount: 800000,
          columns: ['Date', 'Symbol', 'Open', 'High', 'Low', 'Close', 'Volume', 'AdjClose'],
          columnTypes: {},
          preview: [],
          uploadedAt: new Date().toISOString()
        }
      });

      const { container } = render(
        <FileUpload
          onUploadSuccess={mockOnUploadSuccess}
          onUploadError={mockOnUploadError}
        />
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file20MB = createRealisticCSVFile('large-trading-data.csv', 20 * 1024 * 1024);

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file20MB] } });
      });

      await waitFor(() => {
        expect(mockApiUpload).toHaveBeenCalledWith(file20MB, expect.any(Function));
      });

      await waitFor(() => {
        expect(mockOnUploadSuccess).toHaveBeenCalled();
      });

      expect(mockOnUploadError).not.toHaveBeenCalled();
    });

    it('should handle medium-sized CSV files (10MB)', async () => {
      const mockApiUpload = vi.mocked(apiService.uploadFile);
      mockApiUpload.mockResolvedValue({
        success: true,
        data: {
          uploadId: 'test-upload-id',
          filename: 'medium-trading-data.csv',
          rowCount: 400000,
          columns: ['Date', 'Symbol', 'Price', 'Volume'],
          columnTypes: {},
          preview: [],
          uploadedAt: new Date().toISOString()
        }
      });

      const { container } = render(
        <FileUpload
          onUploadSuccess={mockOnUploadSuccess}
          onUploadError={mockOnUploadError}
        />
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file10MB = createRealisticCSVFile('medium-trading-data.csv', 10 * 1024 * 1024);

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file10MB] } });
      });

      await waitFor(() => {
        expect(mockApiUpload).toHaveBeenCalledWith(file10MB, expect.any(Function));
      });

      await waitFor(() => {
        expect(mockOnUploadSuccess).toHaveBeenCalled();
      });

      expect(mockOnUploadError).not.toHaveBeenCalled();
    });

    it('should handle small CSV files (1MB)', async () => {
      const mockApiUpload = vi.mocked(apiService.uploadFile);
      mockApiUpload.mockResolvedValue({
        success: true,
        data: {
          uploadId: 'test-upload-id',
          filename: 'small-trading-data.csv',
          rowCount: 40000,
          columns: ['Date', 'Symbol', 'Price', 'Volume'],
          columnTypes: {},
          preview: [],
          uploadedAt: new Date().toISOString()
        }
      });

      const { container } = render(
        <FileUpload
          onUploadSuccess={mockOnUploadSuccess}
          onUploadError={mockOnUploadError}
        />
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file1MB = createRealisticCSVFile('small-trading-data.csv', 1024 * 1024);

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file1MB] } });
      });

      await waitFor(() => {
        expect(mockApiUpload).toHaveBeenCalledWith(file1MB, expect.any(Function));
      });

      await waitFor(() => {
        expect(mockOnUploadSuccess).toHaveBeenCalled();
      });

      expect(mockOnUploadError).not.toHaveBeenCalled();
    });
  });

  describe('Backend Error Handling Integration', () => {
    it('should handle backend file size rejection for edge cases', async () => {
      const mockApiUpload = vi.mocked(apiService.uploadFile);
      mockApiUpload.mockResolvedValue({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File size exceeds 25MB limit. Please upload a smaller CSV file.'
        }
      });

      const { container } = render(
        <FileUpload
          onUploadSuccess={mockOnUploadSuccess}
          onUploadError={mockOnUploadError}
        />
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      // Create a file that passes frontend validation but might fail backend due to encoding differences
      const file24MB = createRealisticCSVFile('edge-case-file.csv', 24 * 1024 * 1024);

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file24MB] } });
      });

      await waitFor(() => {
        expect(mockApiUpload).toHaveBeenCalledWith(file24MB, expect.any(Function));
      });

      await waitFor(() => {
        expect(mockOnUploadError).toHaveBeenCalledWith('File size exceeds 25MB limit. Please upload a smaller CSV file.');
      });

      expect(mockOnUploadSuccess).not.toHaveBeenCalled();
    });

    it('should handle consistent error messages between frontend and backend', async () => {
      // Test frontend validation error message
      const { container: container1 } = render(
        <FileUpload
          onUploadSuccess={mockOnUploadSuccess}
          onUploadError={mockOnUploadError}
        />
      );

      const fileInput1 = container1.querySelector('input[type="file"]') as HTMLInputElement;
      const fileOver25MB = createMockFile('test-over.csv', (25 * 1024 * 1024) + 1);

      await act(async () => {
        fireEvent.change(fileInput1, { target: { files: [fileOver25MB] } });
      });

      await waitFor(() => {
        expect(screen.getByText('File size must be less than 25MB')).toBeInTheDocument();
      });

      // Test backend validation error message
      vi.clearAllMocks();
      
      const mockApiUpload = vi.mocked(apiService.uploadFile);
      mockApiUpload.mockResolvedValue({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File size exceeds 25MB limit. Please upload a smaller CSV file.'
        }
      });

      const { container: container2 } = render(
        <FileUpload
          onUploadSuccess={mockOnUploadSuccess}
          onUploadError={mockOnUploadError}
        />
      );

      const fileInput2 = container2.querySelector('input[type="file"]') as HTMLInputElement;
      const file24MB = createMockFile('test-24mb.csv', 24 * 1024 * 1024);

      await act(async () => {
        fireEvent.change(fileInput2, { target: { files: [file24MB] } });
      });

      await waitFor(() => {
        expect(mockOnUploadError).toHaveBeenCalledWith('File size exceeds 25MB limit. Please upload a smaller CSV file.');
      });

      // Both error messages should mention 25MB
      expect(mockOnUploadError).toHaveBeenCalledWith(expect.stringContaining('25MB'));
    });
  });

  describe('Progress Handling for Large Files', () => {
    it('should handle upload progress for large files correctly', async () => {
      const mockApiUpload = vi.mocked(apiService.uploadFile);
      let progressCallback: ((progress: number) => void) | undefined;
      
      mockApiUpload.mockImplementation((file, onProgress) => {
        progressCallback = onProgress;
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              success: true,
              data: {
                uploadId: 'test-upload-id',
                filename: file.name,
                rowCount: 800000,
                columns: ['Date', 'Symbol', 'Open', 'High', 'Low', 'Close', 'Volume'],
                columnTypes: {},
                preview: [],
                uploadedAt: new Date().toISOString()
              }
            });
          }, 100);
        });
      });

      const { container } = render(
        <FileUpload
          onUploadSuccess={mockOnUploadSuccess}
          onUploadError={mockOnUploadError}
        />
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file20MB = createRealisticCSVFile('large-progress-test.csv', 20 * 1024 * 1024);

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file20MB] } });
      });

      await waitFor(() => {
        expect(mockApiUpload).toHaveBeenCalled();
      });

      // Simulate progress updates for large file
      if (progressCallback) {
        await act(async () => {
          progressCallback(10);
        });
        await act(async () => {
          progressCallback(25);
        });
        await act(async () => {
          progressCallback(50);
        });
        await act(async () => {
          progressCallback(75);
        });
        await act(async () => {
          progressCallback(90);
        });
        await act(async () => {
          progressCallback(100);
        });
      }

      await waitFor(() => {
        expect(mockOnUploadSuccess).toHaveBeenCalled();
      });
    });

    it('should show appropriate loading state for large files', async () => {
      const mockApiUpload = vi.mocked(apiService.uploadFile);
      mockApiUpload.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              success: true,
              data: {
                uploadId: 'test-upload-id',
                filename: 'large-file.csv',
                rowCount: 1000000,
                columns: ['Date', 'Symbol', 'Price', 'Volume'],
                columnTypes: {},
                preview: [],
                uploadedAt: new Date().toISOString()
              }
            });
          }, 1000); // Longer delay to simulate large file upload
        });
      });

      const { container } = render(
        <FileUpload
          onUploadSuccess={mockOnUploadSuccess}
          onUploadError={mockOnUploadError}
        />
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file24MB = createRealisticCSVFile('large-loading-test.csv', 24 * 1024 * 1024);

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file24MB] } });
      });

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Uploading...')).toBeInTheDocument();
      });

      // Should complete successfully
      await waitFor(() => {
        expect(mockOnUploadSuccess).toHaveBeenCalled();
      }, { timeout: 2000 });
    });
  });

  describe('UI State Verification', () => {
    it('should display correct 25MB limit in UI text', () => {
      render(
        <FileUpload
          onUploadSuccess={mockOnUploadSuccess}
          onUploadError={mockOnUploadError}
        />
      );

      expect(screen.getByText('Maximum file size: 25MB')).toBeInTheDocument();
    });

    it('should have correct file input configuration for 25MB limit', () => {
      const { container } = render(
        <FileUpload
          onUploadSuccess={mockOnUploadSuccess}
          onUploadError={mockOnUploadError}
        />
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput.accept).toBe('.csv');
      expect(fileInput.multiple).toBe(false);
    });

    it('should show consistent error styling for file size violations', async () => {
      const { container } = render(
        <FileUpload
          onUploadSuccess={mockOnUploadSuccess}
          onUploadError={mockOnUploadError}
        />
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const fileOver25MB = createMockFile('test-over.csv', (25 * 1024 * 1024) + 1);

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [fileOver25MB] } });
      });

      await waitFor(() => {
        const errorElement = screen.getByText('File size must be less than 25MB');
        expect(errorElement).toBeInTheDocument();
        
        // Check that error is displayed in error styling
        const errorContainer = errorElement.closest('.bg-red-50');
        expect(errorContainer).toBeInTheDocument();
      });
    });
  });

  describe('Multiple File Size Validation', () => {
    it('should consistently validate different file sizes', async () => {
      const testCases = [
        { size: 1024, shouldPass: true, description: '1KB' },
        { size: 1024 * 1024, shouldPass: true, description: '1MB' },
        { size: 25 * 1024 * 1024, shouldPass: true, description: '25MB (exact)' },
        { size: (25 * 1024 * 1024) + 1, shouldPass: false, description: '25MB + 1 byte' },
        { size: 30 * 1024 * 1024, shouldPass: false, description: '30MB' }
      ];

      for (const { size, shouldPass, description } of testCases) {
        vi.clearAllMocks();
        
        if (shouldPass) {
          const mockApiUpload = vi.mocked(apiService.uploadFile);
          mockApiUpload.mockResolvedValue({
            success: true,
            data: {
              uploadId: 'test-upload-id',
              filename: `test-${description}.csv`,
              rowCount: 1000,
              columns: ['Date', 'Symbol', 'Price', 'Volume'],
              columnTypes: {},
              preview: [],
              uploadedAt: new Date().toISOString()
            }
          });
        }

        const { container, unmount } = render(
          <FileUpload
            onUploadSuccess={mockOnUploadSuccess}
            onUploadError={mockOnUploadError}
          />
        );

        const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
        const testFile = createMockFile(`test-${description}.csv`, size);

        await act(async () => {
          fireEvent.change(fileInput, { target: { files: [testFile] } });
        });

        if (shouldPass) {
          await waitFor(() => {
            expect(mockOnUploadSuccess).toHaveBeenCalled();
          }, { timeout: 10000 });
          expect(mockOnUploadError).not.toHaveBeenCalled();
        } else {
          await waitFor(() => {
            expect(mockOnUploadError).toHaveBeenCalledWith('File size must be less than 25MB');
          });
          expect(mockOnUploadSuccess).not.toHaveBeenCalled();
        }

        unmount();
      }
    }, 30000); // Increase timeout for this test
  });
});