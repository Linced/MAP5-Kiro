# Design Document

## Overview

This design outlines the changes needed to increase the file upload size limit from the current inconsistent limits (10MB frontend, 20MB backend) to a unified 25MB limit across both frontend and backend components. The changes are minimal and focused on configuration updates to existing file upload infrastructure.

## Architecture

The existing file upload architecture will remain unchanged. The modification involves updating configuration values in two key components:

1. **Frontend File Validation** - Update size check in FileUpload component
2. **Backend Multer Middleware** - Update limits configuration in upload middleware

## Components and Interfaces

### Frontend Components

#### FileUpload Component (`frontend/src/components/upload/FileUpload.tsx`)
- **Current State**: 10MB limit (10 * 1024 * 1024 bytes)
- **Required Changes**: 
  - Update `maxSize` constant to 25MB (25 * 1024 * 1024 bytes)
  - Update error message text to reflect 25MB limit
  - Update UI display text to show 25MB maximum

### Backend Components

#### Upload Middleware (`backend/src/middleware/upload.ts`)
- **Current State**: 20MB limit in multer configuration
- **Required Changes**:
  - Update `limits.fileSize` to 25MB (25 * 1024 * 1024 bytes)

## Data Models

No changes to existing data models are required. The file upload tracking and storage mechanisms will continue to work with the larger file sizes without modification.

## Error Handling

### Frontend Error Handling
- Update file size validation error message to display "File size must be less than 25MB"
- Maintain existing error handling patterns for consistency

### Backend Error Handling
- Multer will automatically handle files exceeding 25MB with existing error handling
- No changes needed to error response structure

## Testing Strategy

### Unit Tests
- Update existing file upload validation tests to use 25MB limits
- Test boundary conditions:
  - Files exactly at 25MB limit (should pass)
  - Files slightly over 25MB limit (should fail)
  - Files well under 25MB limit (should pass)

### Integration Tests
- Test end-to-end file upload with files approaching 25MB
- Verify consistent behavior between frontend validation and backend processing
- Test error messages display correctly in UI

### Manual Testing
- Upload test files of various sizes (24MB, 25MB, 26MB) to verify behavior
- Confirm UI displays correct size limits
- Verify error messages are accurate

## Implementation Notes

### Configuration Constants
To maintain consistency and ease future updates, consider extracting the file size limit to a shared configuration:

```typescript
// Shared constant
export const MAX_FILE_SIZE_MB = 25;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
```

### Backward Compatibility
- Existing uploaded files will not be affected
- No database migrations required
- No API contract changes needed

## Security Considerations

- The 25MB limit is reasonable for CSV files and maintains system stability
- Existing file type validation (CSV only) remains in place
- No additional security risks introduced by the size increase
- Memory usage should be monitored with larger files, but existing memory management should handle 25MB files appropriately

## Performance Impact

- Minimal performance impact expected
- Larger files will take longer to upload and process, but this is expected behavior
- Existing memory management and processing queues should handle 25MB files within current system constraints
- Network transfer time will increase proportionally with file size