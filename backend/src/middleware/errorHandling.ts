import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorLogger, createErrorResponse } from '../utils/errors';
import { logger } from '../utils/logger';

// Request context interface
interface RequestContext {
  requestId: string;
  userId?: number;
  method: string;
  url: string;
  userAgent?: string;
  ip: string;
  startTime: number;
}

// Enhanced error handling middleware
export function enhancedErrorHandler(
  error: Error,
  req: Request & { requestId?: string; startTime?: number },
  res: Response,
  next: NextFunction
): void {
  const context: RequestContext = {
    requestId: req.requestId || `req-${Date.now()}`,
    userId: (req as any).user?.id,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'] || undefined,
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    startTime: req.startTime || Date.now()
  };

  // Calculate request duration
  const duration = Date.now() - context.startTime;

  // Enhanced error logging
  ErrorLogger.log(error, {
    ...context,
    duration,
    body: req.method !== 'GET' ? req.body : undefined,
    params: req.params,
    query: req.query,
    headers: {
      'content-type': req.headers['content-type'],
      'authorization': req.headers.authorization ? '[REDACTED]' : undefined,
      'user-agent': req.headers['user-agent']
    }
  });

  // Determine if we should expose error details
  const isProduction = process.env.NODE_ENV === 'production';
  const isAppError = error instanceof AppError;
  
  let statusCode = 500;
  let errorResponse;

  if (isAppError) {
    statusCode = error.statusCode;
    
    // In production, only expose operational errors
    if (isProduction && !error.isOperational) {
      errorResponse = createErrorResponse(
        new AppError('Something went wrong. Please try again later.', 500),
        req.path
      );
    } else {
      errorResponse = createErrorResponse(error, req.path);
    }
  } else {
    // Handle specific error types
    if (error.name === 'ValidationError') {
      statusCode = 400;
      errorResponse = createErrorResponse(
        new AppError('Validation failed', 400, 'VALIDATION_ERROR', error.message),
        req.path
      );
    } else if (error.name === 'CastError') {
      statusCode = 400;
      errorResponse = createErrorResponse(
        new AppError('Invalid data format', 400, 'INVALID_INPUT'),
        req.path
      );
    } else if (error.name === 'MulterError') {
      statusCode = 400;
      const message = error.message.includes('File too large') 
        ? 'File size exceeds limit' 
        : 'File upload error';
      errorResponse = createErrorResponse(
        new AppError(message, 400, 'FILE_UPLOAD_ERROR'),
        req.path
      );
    } else {
      // Generic error - don't expose details in production
      const message = isProduction 
        ? 'Something went wrong. Please try again later.'
        : error.message;
      
      errorResponse = createErrorResponse(
        new AppError(message, 500),
        req.path
      );
    }
  }

  // Log performance issues
  if (duration > 5000) {
    logger.warn(`Slow request: ${req.method} ${req.url} took ${duration}ms`, {
      ...context,
      duration,
      performance: 'slow_request'
    });
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
}

// Request timeout middleware
export function requestTimeout(timeoutMs: number = 30000) {
  return (req: Request & { startTime?: number }, res: Response, next: NextFunction) => {
    req.startTime = Date.now();
    
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        const error = new AppError(
          'Request timeout',
          408,
          'TIMEOUT_ERROR'
        );
        
        ErrorLogger.log(error, {
          method: req.method,
          url: req.url,
          timeout: timeoutMs,
          userAgent: req.headers['user-agent'],
          ip: req.ip
        });

        res.status(408).json(createErrorResponse(error, req.path));
      }
    }, timeoutMs);

    // Clear timeout when response is sent
    res.on('finish', () => {
      clearTimeout(timeout);
    });

    next();
  };
}

// Rate limiting error handler
export function rateLimitErrorHandler(
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const error = new AppError(
    'Too many requests. Please try again later.',
    429,
    'RATE_LIMIT_EXCEEDED'
  );

  ErrorLogger.log(error, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    type: 'rate_limit'
  });

  res.status(429).json(createErrorResponse(error, req.path));
}

// 404 handler
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const error = new AppError(
    `Route ${req.method} ${req.path} not found`,
    404,
    'RESOURCE_NOT_FOUND'
  );

  logger.warn(`404 - Route not found: ${req.method} ${req.path}`, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(404).json(createErrorResponse(error, req.path));
}

// Health check error handler
export function healthCheckErrorHandler(error: Error): void {
  logger.error('Health check failed', error, {
    type: 'health_check',
    timestamp: new Date().toISOString()
  });
}

// Database connection error handler
export function databaseErrorHandler(error: Error): void {
  logger.error('Database connection error', error, {
    type: 'database_connection',
    timestamp: new Date().toISOString(),
    severity: 'critical'
  });
}

// Unhandled promise rejection handler
export function unhandledRejectionHandler(reason: any, promise: Promise<any>): void {
  logger.error('Unhandled Promise Rejection', new Error(String(reason)), {
    type: 'unhandled_rejection',
    promise: promise.toString(),
    timestamp: new Date().toISOString(),
    severity: 'critical'
  });

  // In production, you might want to gracefully shut down
  if (process.env.NODE_ENV === 'production') {
    console.error('Unhandled Promise Rejection. Shutting down gracefully...');
    process.exit(1);
  }
}

// Uncaught exception handler
export function uncaughtExceptionHandler(error: Error): void {
  logger.error('Uncaught Exception', error, {
    type: 'uncaught_exception',
    timestamp: new Date().toISOString(),
    severity: 'critical'
  });

  console.error('Uncaught Exception. Shutting down...');
  process.exit(1);
}

// Setup global error handlers
export function setupGlobalErrorHandlers(): void {
  process.on('unhandledRejection', unhandledRejectionHandler);
  process.on('uncaughtException', uncaughtExceptionHandler);
}

// Error metrics collector
export class ErrorMetrics {
  private static instance: ErrorMetrics;
  private errorCounts: Map<string, number> = new Map();
  private errorsByEndpoint: Map<string, number> = new Map();
  private errorsByUser: Map<number, number> = new Map();
  private lastReset: Date = new Date();

  static getInstance(): ErrorMetrics {
    if (!ErrorMetrics.instance) {
      ErrorMetrics.instance = new ErrorMetrics();
    }
    return ErrorMetrics.instance;
  }

  recordError(error: AppError | Error, context?: any): void {
    const errorCode = error instanceof AppError ? error.code : 'UNKNOWN_ERROR';
    
    // Count by error type
    this.errorCounts.set(errorCode, (this.errorCounts.get(errorCode) || 0) + 1);
    
    // Count by endpoint
    if (context?.url) {
      const endpoint = `${context.method} ${context.url}`;
      this.errorsByEndpoint.set(endpoint, (this.errorsByEndpoint.get(endpoint) || 0) + 1);
    }
    
    // Count by user
    if (context?.userId) {
      this.errorsByUser.set(context.userId, (this.errorsByUser.get(context.userId) || 0) + 1);
    }
  }

  getMetrics(): any {
    return {
      errorCounts: Object.fromEntries(this.errorCounts),
      errorsByEndpoint: Object.fromEntries(this.errorsByEndpoint),
      errorsByUser: Object.fromEntries(this.errorsByUser),
      totalErrors: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0),
      lastReset: this.lastReset,
      uptime: Date.now() - this.lastReset.getTime()
    };
  }

  reset(): void {
    this.errorCounts.clear();
    this.errorsByEndpoint.clear();
    this.errorsByUser.clear();
    this.lastReset = new Date();
  }
}

// Middleware to collect error metrics
export function errorMetricsMiddleware(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  ErrorMetrics.getInstance().recordError(error, {
    method: req.method,
    url: req.url,
    userId: (req as any).user?.id
  });
  
  next(error);
}