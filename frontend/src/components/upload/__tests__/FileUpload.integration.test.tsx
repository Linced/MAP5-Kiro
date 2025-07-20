import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { FileUpload } from '../FileUpload';
import { apiService } from '../../../services/api';

// Mock the API service
vi.mock('../../../services/api', () => ({
  apiService: {
    uploadFile: vi.fn(),
  },
}));

// Helper function to create mock files
const createMockFile = (name: string, size: number, type: string = 'text/csv'): File => {
  const content = 'A'.repeat(size);
  const file = new File([content], name, { type });
  
  // Mock the size property since File constructor doesn't set it properly in tests
  Object.defineProperty(file, 'size', {
    value: size,
    writable: false,
  });
  
  return file;
};

describe('FileUpload Integration Tests', () => {
  const mockOnUploadSuccess = vi.fn();
  const mockOnUploadError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('25MB File Size Limit Integration', () => {
    it('should accept files up to 25MB and attempt upload', async () => {
      const mockApiUpload = vi.mocked(apiService.uploadFile);
      mockApiUpload.mockResolvedValue({
        success: true,
        data: {
          uploadId: 'test-upload-id',
          filename: 'test-25mb.csv',
          rowCount: 1000,
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
      const file25MB = createMockFile('test-25mb.csv', 25 * 1024 * 1024);

      fireEvent.change(fileInput, { target: { files: [file25MB] } });

      await waitFor(() => {
        expect(mockApiUpload).toHaveBeenCalledWith(file25MB, expect.any(Function));
      });

      await waitFor(() => {
        expect(mockOnUploadSuccess).toHaveBeenCalled();
      });

      expect(mockOnUploadError).not.toHaveBeenCalled();
    });

    it('should reject files larger than 25MB with appropriate error message', async () => {
      render(
        <FileUpload
          onUploadSuccess={mockOnUploadSuccess}
          onUploadError={mockOnUploadError}
        />
      );

      const { container } = render(
        <FileUpload
          onUploadSuccess={mockOnUploadSuccess}
          onUploadError={mockOnUploadError}
        />
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const fileOver25MB = createMockFile('test-over-25mb.csv', (25 * 1024 * 1024) + 1);

      fireEvent.change(fileInput, { target: { files: [fileOver25MB] } });

      await waitFor(() => {
        expect(screen.getByText('File size must be less than 25MB')).toBeInTheDocument();
      });

      expect(mockOnUploadError).toHaveBeenCalledWith('File size must be less than 25MB');
      expect(apiService.uploadFile).not.toHaveBeenCalled();
    });

    it('should accept files just under 25MB', async () => {
      const mockApiUpload = vi.mocked(apiService.uploadFile);
      mockApiUpload.mockResolvedValue({
        success: true,
        data: {
          uploadId: 'test-upload-id',
          filename: 'test-under-25mb.csv',
          rowCount: 1000,
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
      const fileUnder25MB = createMockFile('test-under-25mb.csv', (25 * 1024 * 1024) - 1);

      fireEvent.change(fileInput, { target: { files: [fileUnder25MB] } });

      await waitFor(() => {
        expect(mockApiUpload).toHaveBeenCalledWith(fileUnder25MB, expect.any(Function));
      });

      await waitFor(() => {
        expect(mockOnUploadSuccess).toHaveBeenCalled();
      });

      expect(mockOnUploadError).not.toHaveBeenCalled();
    });

    it('should handle exactly 25MB files', async () => {
      const mockApiUpload = vi.mocked(apiService.uploadFile);
      mockApiUpload.mockResolvedValue({
        success: true,
        data: {
          uploadId: 'test-upload-id',
          filename: 'test-exactly-25mb.csv',
          rowCount: 1000,
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
      const fileExactly25MB = createMockFile('test-exactly-25mb.csv', 25 * 1024 * 1024);

      fireEvent.change(fileInput, { target: { files: [fileExactly25MB] } });

      await waitFor(() => {
        expect(mockApiUpload).toHaveBeenCalledWith(fileExactly25MB, expect.any(Function));
      });

      await waitFor(() => {
        expect(mockOnUploadSuccess).toHaveBeenCalled();
      });

      expect(mockOnUploadError).not.toHaveBeenCalled();
    });
  });

  describe('File Type Validation Integration', () => {
    it('should accept CSV files and attempt upload', async () => {
      const mockApiUpload = vi.mocked(apiService.uploadFile);
      mockApiUpload.mockResolvedValue({
        success: true,
        data: {
          uploadId: 'test-upload-id',
          filename: 'test.csv',
          rowCount: 100,
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
      const csvFile = createMockFile('test.csv', 1024, 'text/csv');

      fireEvent.change(fileInput, { target: { files: [csvFile] } });

      await waitFor(() => {
        expect(mockApiUpload).toHaveBeenCalledWith(csvFile, expect.any(Function));
      });

      await waitFor(() => {
        expect(mockOnUploadSuccess).toHaveBeenCalled();
      });

      expect(mockOnUploadError).not.toHaveBeenCalled();
    });

    it('should reject non-CSV files with appropriate error message', async () => {
      const { container } = render(
        <FileUpload
          onUploadSuccess={mockOnUploadSuccess}
          onUploadError={mockOnUploadError}
        />
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const txtFile = createMockFile('test.txt', 1024, 'text/plain');

      fireEvent.change(fileInput, { target: { files: [txtFile] } });

      await waitFor(() => {
        expect(screen.getByText('Please select a CSV file (.csv extension required)')).toBeInTheDocument();
      });

      expect(mockOnUploadError).toHaveBeenCalledWith('Please select a CSV file (.csv extension required)');
      expect(apiService.uploadFile).not.toHaveBeenCalled();
    });

    it('should accept CSV files with uppercase extension', async () => {
      const mockApiUpload = vi.mocked(apiService.uploadFile);
      mockApiUpload.mockResolvedValue({
        success: true,
        data: {
          uploadId: 'test-upload-id',
          filename: 'TEST.CSV',
          rowCount: 100,
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
      const csvFile = createMockFile('TEST.CSV', 1024, 'text/csv');

      fireEvent.change(fileInput, { target: { files: [csvFile] } });

      await waitFor(() => {
        expect(mockApiUpload).toHaveBeenCalledWith(csvFile, expect.any(Function));
      });

      await waitFor(() => {
        expect(mockOnUploadSuccess).toHaveBeenCalled();
      });

      expect(mockOnUploadError).not.toHaveBeenCalled();
    });
  });

  describe('Backend Error Handling Integration', () => {
    it('should handle backend file size rejection properly', async () => {
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
      const largeFile = createMockFile('large-file.csv', 20 * 1024 * 1024); // 20MB, should pass frontend validation

      fireEvent.change(fileInput, { target: { files: [largeFile] } });

      await waitFor(() => {
        expect(mockApiUpload).toHaveBeenCalledWith(largeFile, expect.any(Function));
      });

      await waitFor(() => {
        expect(mockOnUploadError).toHaveBeenCalledWith('File size exceeds 25MB limit. Please upload a smaller CSV file.');
      });

      expect(mockOnUploadSuccess).not.toHaveBeenCalled();
    });

    it('should handle backend file type rejection properly', async () => {
      const mockApiUpload = vi.mocked(apiService.uploadFile);
      mockApiUpload.mockResolvedValue({
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: 'Only CSV files are allowed. Please upload a .csv file.'
        }
      });

      const { container } = render(
        <FileUpload
          onUploadSuccess={mockOnUploadSuccess}
          onUploadError={mockOnUploadError}
        />
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      // Create a file that passes frontend validation but might fail backend
      const csvFile = createMockFile('test.csv', 1024, 'text/csv');

      fireEvent.change(fileInput, { target: { files: [csvFile] } });

      await waitFor(() => {
        expect(mockApiUpload).toHaveBeenCalledWith(csvFile, expect.any(Function));
      });

      await waitFor(() => {
        expect(mockOnUploadError).toHaveBeenCalledWith('Only CSV files are allowed. Please upload a .csv file.');
      });

      expect(mockOnUploadSuccess).not.toHaveBeenCalled();
    });

    it('should handle network errors gracefully', async () => {
      const mockApiUpload = vi.mocked(apiService.uploadFile);
      mockApiUpload.mockRejectedValue(new Error('Network error'));

      const { container } = render(
        <FileUpload
          onUploadSuccess={mockOnUploadSuccess}
          onUploadError={mockOnUploadError}
        />
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const csvFile = createMockFile('test.csv', 1024, 'text/csv');

      fireEvent.change(fileInput, { target: { files: [csvFile] } });

      await waitFor(() => {
        expect(mockApiUpload).toHaveBeenCalledWith(csvFile, expect.any(Function));
      });

      await waitFor(() => {
        expect(mockOnUploadError).toHaveBeenCalledWith('Upload failed. Please try again.');
      });

      expect(mockOnUploadSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Progress Handling Integration', () => {
    it('should handle upload progress correctly', async () => {
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
                rowCount: 100,
                columns: ['Date', 'Symbol', 'Price', 'Volume'],
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
      const csvFile = createMockFile('test.csv', 1024, 'text/csv');

      fireEvent.change(fileInput, { target: { files: [csvFile] } });

      await waitFor(() => {
        expect(mockApiUpload).toHaveBeenCalled();
      });

      // Simulate progress updates
      if (progressCallback) {
        progressCallback(25);
        progressCallback(50);
        progressCallback(75);
        progressCallback(100);
      }

      await waitFor(() => {
        expect(mockOnUploadSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('UI State Integration', () => {
    it('should display correct file size limit in UI', () => {
      render(
        <FileUpload
          onUploadSuccess={mockOnUploadSuccess}
          onUploadError={mockOnUploadError}
        />
      );

      expect(screen.getByText('Maximum file size: 25MB')).toBeInTheDocument();
    });

    it('should show upload interface with correct instructions', () => {
      render(
        <FileUpload
          onUploadSuccess={mockOnUploadSuccess}
          onUploadError={mockOnUploadError}
        />
      );

      expect(screen.getByText('Drop your CSV file here, or click to select')).toBeInTheDocument();
      expect(screen.getByText('Maximum file size: 25MB')).toBeInTheDocument();
    });

    it('should have correct file input configuration', () => {
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
  });
});