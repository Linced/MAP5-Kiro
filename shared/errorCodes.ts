// Shared error codes between frontend and backend
// This eliminates duplication and ensures consistency

export enum ErrorCodes {
  // Authentication errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // File upload errors
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_UPLOAD_FAILED = 'FILE_UPLOAD_FAILED',
  CSV_PARSE_ERROR = 'CSV_PARSE_ERROR',
  
  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  FOREIGN_KEY_CONSTRAINT = 'FOREIGN_KEY_CONSTRAINT',
  
  // Business logic errors
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  
  // System errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Email service errors
  EMAIL_SEND_FAILED = 'EMAIL_SEND_FAILED',
  EMAIL_SERVICE_UNAVAILABLE = 'EMAIL_SERVICE_UNAVAILABLE',
  
  // Client-side errors
  COMPONENT_ERROR = 'COMPONENT_ERROR',
  RENDER_ERROR = 'RENDER_ERROR'
}

// User-friendly error messages
export const ERROR_MESSAGES: Record<string, string> = {
  [ErrorCodes.NETWORK_ERROR]: 'Unable to connect to the server. Please check your internet connection and try again.',
  [ErrorCodes.TIMEOUT_ERROR]: 'The request took too long to complete. Please try again.',
  [ErrorCodes.CONNECTION_ERROR]: 'Connection lost. Please check your internet connection.',
  [ErrorCodes.INVALID_CREDENTIALS]: 'Invalid email or password. Please check your credentials and try again.',
  [ErrorCodes.EMAIL_NOT_VERIFIED]: 'Please verify your email address before logging in.',
  [ErrorCodes.EMAIL_ALREADY_EXISTS]: 'An account with this email already exists.',
  [ErrorCodes.FILE_TOO_LARGE]: 'The file is too large. Please select a file smaller than 10MB.',
  [ErrorCodes.INVALID_FILE_TYPE]: 'Invalid file type. Please select a CSV file.',
  [ErrorCodes.CSV_PARSE_ERROR]: 'Unable to parse the CSV file. Please check the file format and try again.',
  [ErrorCodes.VALIDATION_ERROR]: 'Please check your input and try again.',
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please wait a moment and try again.',
  [ErrorCodes.SERVICE_UNAVAILABLE]: 'The service is temporarily unavailable. Please try again later.',
  [ErrorCodes.INTERNAL_SERVER_ERROR]: 'Something went wrong on our end. Please try again later.'
};