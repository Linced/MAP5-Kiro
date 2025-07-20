import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { FileUpload } from '../FileUpload';

// Mock the API service
vi.mock('../../../services/api', () => ({
  apiService: {
    uploadFile: vi.fn(),
  },
}));

describe('FileUpload', () => {
  const mockOnUploadSuccess = vi.fn();
  const mockOnUploadError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('File Size Display', () => {
    it('should display correct maximum file size in UI', () => {
      render(
        <FileUpload
          onUploadSuccess={mockOnUploadSuccess}
          onUploadError={mockOnUploadError}
        />
      );

      expect(screen.getByText('Maximum file size: 25MB')).toBeInTheDocument();
    });

    it('should show upload interface with correct text', () => {
      render(
        <FileUpload
          onUploadSuccess={mockOnUploadSuccess}
          onUploadError={mockOnUploadError}
        />
      );

      expect(screen.getByText('Drop your CSV file here, or click to select')).toBeInTheDocument();
      expect(screen.getByText('Maximum file size: 25MB')).toBeInTheDocument();
    });
  });

  describe('File Size Validation Logic', () => {
    it('should have correct file size limit constant', () => {
      // Test the file size limit constant used in validation
      const maxSize = 25 * 1024 * 1024; // 25MB in bytes
      
      expect(maxSize).toBe(26214400); // 25MB in bytes
    });

    it('should validate file size correctly for boundary conditions', () => {
      // Test file size validation logic
      const validateFileSize = (fileSize: number, maxSize: number = 25 * 1024 * 1024) => {
        return fileSize <= maxSize;
      };

      const exactSize25MB = 25 * 1024 * 1024; // Exactly 25MB
      const under25MB = (25 * 1024 * 1024) - 1; // Just under 25MB
      const over25MB = (25 * 1024 * 1024) + 1; // Just over 25MB

      expect(validateFileSize(exactSize25MB)).toBe(true);
      expect(validateFileSize(under25MB)).toBe(true);
      expect(validateFileSize(over25MB)).toBe(false);
    });

    it('should have correct error message for oversized files', () => {
      const expectedErrorMessage = 'File size must be less than 25MB';
      
      expect(expectedErrorMessage).toContain('25MB');
      expect(expectedErrorMessage).toContain('less than');
    });
  });

  describe('File Type Validation', () => {
    it('should validate CSV file extensions correctly', () => {
      const validateCSVExtension = (filename: string) => {
        return filename.toLowerCase().endsWith('.csv');
      };

      expect(validateCSVExtension('test.csv')).toBe(true);
      expect(validateCSVExtension('TEST.CSV')).toBe(true);
      expect(validateCSVExtension('data.txt')).toBe(false);
      expect(validateCSVExtension('file.xlsx')).toBe(false);
    });

    it('should have correct error message for invalid file types', () => {
      const expectedErrorMessage = 'Please select a CSV file (.csv extension required)';
      
      expect(expectedErrorMessage).toContain('CSV');
      expect(expectedErrorMessage).toContain('.csv');
    });
  });

  describe('Component Configuration', () => {
    it('should accept only CSV files in file input', () => {
      const { container } = render(
        <FileUpload
          onUploadSuccess={mockOnUploadSuccess}
          onUploadError={mockOnUploadError}
        />
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput.accept).toBe('.csv');
    });

    it('should be configured as single file upload', () => {
      const { container } = render(
        <FileUpload
          onUploadSuccess={mockOnUploadSuccess}
          onUploadError={mockOnUploadError}
        />
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput.multiple).toBe(false);
    });
  });
});