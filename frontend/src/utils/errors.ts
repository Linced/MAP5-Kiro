// Frontend error types and utilities

// Error codes enum for frontend
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
  
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  
  // System errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
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

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Custom error class for frontend
export class AppError extends Error {
  public readonly code: string;
  public readonly severity: ErrorSeverity;
  public readonly timestamp: Date;
  public readonly context?: any;
  public readonly userMessage?: string;

  constructor(
    message: string,
    code: string = ErrorCodes.INTERNAL_SERVER_ERROR,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: any,
    userMessage?: string
  ) {
    super(message);
    
    this.code = code;
    this.severity = severity;
    this.timestamp = new Date();
    this.context = context;
    this.userMessage = userMessage;
    
    // Maintains proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// ERROR_MESSAGES is already exported above

// Get user-friendly error message
export function getUserFriendlyMessage(error: any): string {
  if (error instanceof AppError && error.userMessage) {
    return error.userMessage;
  }
  
  const code = error?.code || error?.response?.data?.error?.code;
  if (code && ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code];
  }
  
  // Check for specific error patterns
  if (error?.message?.includes('Network Error') || !error?.response) {
    return ERROR_MESSAGES[ErrorCodes.NETWORK_ERROR];
  }
  
  if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
    return ERROR_MESSAGES[ErrorCodes.TIMEOUT_ERROR];
  }
  
  // Default message
  return 'An unexpected error occurred. Please try again.';
}

// Error classification
export function classifyError(error: any): ErrorSeverity {
  if (error instanceof AppError) {
    return error.severity;
  }
  
  const code = error?.code || error?.response?.data?.error?.code;
  const status = error?.response?.status;
  
  // Critical errors
  if (status >= 500 || code === ErrorCodes.INTERNAL_SERVER_ERROR) {
    return ErrorSeverity.CRITICAL;
  }
  
  // High severity errors
  if (status === 401 || status === 403 || code === ErrorCodes.INVALID_CREDENTIALS) {
    return ErrorSeverity.HIGH;
  }
  
  // Medium severity errors
  if (status >= 400 || code === ErrorCodes.VALIDATION_ERROR) {
    return ErrorSeverity.MEDIUM;
  }
  
  // Default to low severity
  return ErrorSeverity.LOW;
}

// Error reporting utility
export class ErrorReporter {
  private static instance: ErrorReporter;
  private errorQueue: Array<{
    error: Error;
    context?: any;
    timestamp: Date;
    reported: boolean;
  }> = [];

  private constructor() {
    // Process error queue periodically
    setInterval(() => this.processErrorQueue(), 30000); // Every 30 seconds
  }

  static getInstance(): ErrorReporter {
    if (!ErrorReporter.instance) {
      ErrorReporter.instance = new ErrorReporter();
    }
    return ErrorReporter.instance;
  }

  report(error: Error, context?: any): void {
    const errorEntry = {
      error,
      context: {
        ...context,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date(),
      reported: false
    };

    this.errorQueue.push(errorEntry);
    
    // Log immediately for development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error reported:', errorEntry);
    }
  }

  private async processErrorQueue(): Promise<void> {
    const unreportedErrors = this.errorQueue.filter(entry => !entry.reported);
    
    if (unreportedErrors.length === 0) {
      return;
    }

    try {
      // In production, send errors to error tracking service
      // await errorTrackingService.reportErrors(unreportedErrors);
      
      // Mark as reported
      unreportedErrors.forEach(entry => {
        entry.reported = true;
      });
      
      // Clean up old entries (keep last 100)
      if (this.errorQueue.length > 100) {
        this.errorQueue = this.errorQueue.slice(-100);
      }
      
    } catch (reportingError) {
      console.error('Failed to report errors:', reportingError);
    }
  }

  getUnreportedCount(): number {
    return this.errorQueue.filter(entry => !entry.reported).length;
  }

  clear(): void {
    this.errorQueue = [];
  }
}

// Error context collector
export function collectErrorContext(): any {
  return {
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    connection: (navigator as any).connection ? {
      effectiveType: (navigator as any).connection.effectiveType,
      downlink: (navigator as any).connection.downlink,
      rtt: (navigator as any).connection.rtt
    } : null,
    memory: (performance as any).memory ? {
      usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
      totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
      jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
    } : null
  };
}

// Global error handler for unhandled promise rejections
export function setupGlobalErrorHandlers(): void {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    const context = collectErrorContext();
    
    ErrorReporter.getInstance().report(error, {
      ...context,
      type: 'unhandledRejection'
    });
  });

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error);
    
    const error = event.error || new Error(event.message);
    const context = collectErrorContext();
    
    ErrorReporter.getInstance().report(error, {
      ...context,
      type: 'uncaughtError',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });
}

// Validation error helpers
export function createValidationError(field: string, message: string): AppError {
  return new AppError(
    `Validation failed for ${field}: ${message}`,
    ErrorCodes.VALIDATION_ERROR,
    ErrorSeverity.LOW,
    { field, validationMessage: message },
    message
  );
}

export function formatValidationErrors(errors: any[]): string {
  if (!errors || errors.length === 0) {
    return 'Validation failed';
  }
  
  if (errors.length === 1) {
    return errors[0].message || errors[0];
  }
  
  return `Multiple validation errors: ${errors.map(e => e.message || e).join(', ')}`;
}