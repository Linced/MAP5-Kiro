# Requirements Document

## Introduction

This feature enhances the existing file upload system by increasing the maximum file size limit from the current 10MB (frontend) and 20MB (backend) to a consistent 25MB across both frontend and backend components. This will allow users to upload larger CSV files for trade data analysis.

## Requirements

### Requirement 1

**User Story:** As a user, I want to upload CSV files up to 25MB in size, so that I can analyze larger datasets without being restricted by file size limitations.

#### Acceptance Criteria

1. WHEN a user selects a CSV file up to 25MB THEN the system SHALL accept the file for upload
2. WHEN a user selects a CSV file larger than 25MB THEN the system SHALL display an error message indicating the file exceeds the size limit
3. WHEN the file upload validation runs THEN the system SHALL check against the new 25MB limit
4. WHEN the backend receives a file upload request THEN the system SHALL accept files up to 25MB in size

### Requirement 2

**User Story:** As a user, I want to see accurate file size limit information in the UI, so that I know the current upload restrictions.

#### Acceptance Criteria

1. WHEN a user views the file upload interface THEN the system SHALL display "Maximum file size: 25MB" 
2. WHEN a file exceeds the size limit THEN the system SHALL display "File size must be less than 25MB"
3. WHEN the upload interface loads THEN all displayed size limits SHALL reflect the new 25MB maximum

### Requirement 3

**User Story:** As a system administrator, I want the frontend and backend file size limits to be consistent, so that there are no discrepancies in file upload handling.

#### Acceptance Criteria

1. WHEN the frontend validates file size THEN it SHALL use the same 25MB limit as the backend
2. WHEN the backend processes file uploads THEN it SHALL accept files up to 25MB consistently
3. WHEN either frontend or backend rejects a file THEN both SHALL use the same size threshold for rejection