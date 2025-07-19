import { Request, Response, NextFunction } from 'express';

// Error codes enum for backend
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
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Email service errors
  EMAIL_SEND_FAILED = 'EMAIL_SEND_FAILED',
  EMAIL_SERVICE_UNAVAILABLE = 'EMAIL_SERVICE_UNAVAILABLE'
}

// Custom error class
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = ErrorCodes.INTERNAL_SERVER_ERROR,
    details?: any,
    isOperational: boolean = true
  ) {
    super(message);
    
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
    
    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error classes for common scenarios
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, ErrorCodes.VALIDATION_ERROR, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', code: string = ErrorCodes.INVALID_CREDENTIALS) {
    super(message, 401, code);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, ErrorCodes.INSUFFICIENT_PERMISSIONS);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, ErrorCodes.RESOURCE_NOT_FOUND);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, ErrorCodes.DUPLICATE_ENTRY, details);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, ErrorCodes.DATABASE_ERROR, details);
  }
}

export class FileUploadError extends AppError {
  constructor(message: string, code: string = ErrorCodes.FILE_UPLOAD_FAILED, details?: any) {
    super(message, 400, code, details);
  }
}

export class EmailError extends AppError {
  constructor(message: string, code: string = ErrorCodes.EMAIL_SEND_FAILED) {
    super(message, 500, code);
  }
}

// Error response interface
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    path?: string;
  };
}

// Helper function to create consistent error responses
export function createErrorResponse(
  error: AppError | Error,
  path?: string
): ErrorResponse {
  const isAppError = error instanceof AppError;
  
  return {
    success: false,
    error: {
      code: isAppError ? error.code : ErrorCodes.INTERNAL_SERVER_ERROR,
      message: error.message,
      details: isAppError ? error.details : undefined,
      timestamp: new Date().toISOString(),
      ...(path && { path })
    }
  };
}

// Error logging utility
import { logger } from './logger';

export class ErrorLogger {
  static log(error: Error, context?: any) {
    const isAppError = error instanceof AppError;
    
    logger.error(
      `${isAppError ? 'APP_ERROR' : 'SYSTEM_ERROR'}: ${error.message}`,
      error,
      {
        ...context,
        code: isAppError ? error.code : 'UNKNOWN',
        isOperational: isAppError ? error.isOperational : false,
        statusCode: isAppError ? error.statusCode : 500
      },
      context?.userId,
      context?.requestId
    );
  }
}

// Global error handler middleware
export function globalErrorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log the error
  ErrorLogger.log(error, {
    method: req.method,
    url: req.url,
    body: req.body,
    params: req.params,
    query: req.query,
    userId: (req as any).user?.id
  });

  // Don't leak error details in production for non-operational errors
  const isProduction = process.env.NODE_ENV === 'production';
  const isAppError = error instanceof AppError;
  
  if (isProduction && (!isAppError || (error instanceof AppError && !error.isOperational))) {
    const genericError = new AppError(
      'Something went wrong. Please try again later.',
      500,
      ErrorCodes.INTERNAL_SERVER_ERROR
    );
    
    const errorResponse = createErrorResponse(genericError, req.path);
    res.status(500).json(errorResponse);
    return;
  }

  // Send detailed error response
  const statusCode = isAppError ? error.statusCode : 500;
  const errorResponse = createErrorResponse(error, req.path);
  
  res.status(statusCode).json(errorResponse);
}

// Async error wrapper to catch async errors in route handlers
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Database error mapper
export function mapDatabaseError(error: any): AppError {
  // SQLite specific error handling
  if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return new ConflictError('A record with this information already exists', {
      constraint: error.message
    });
  }
  
  if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    return new ValidationError('Referenced record does not exist', {
      constraint: error.message
    });
  }
  
  if (error.code === 'SQLITE_CONSTRAINT_NOTNULL') {
    return new ValidationError('Required field is missing', {
      constraint: error.message
    });
  }
  
  // Generic database error
  return new DatabaseError('Database operation failed', {
    originalError: error.message,
    code: error.code
  });
}

// Validation error formatter
export function formatValidationErrors(errors: any[]): ValidationError {
  const details = errors.map(err => ({
    field: err.path || err.key,
    message: err.message,
    value: err.value
  }));
  
  return new ValidationError('Validation failed', details);
}