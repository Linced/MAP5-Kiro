import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { JWTUtils } from '../utils/jwt';
import { User } from '../types';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: User;
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = JWTUtils.extractTokenFromHeader(authHeader);

    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token is required'
        }
      });
      return;
    }

    // Verify token and get user
    const authService = new AuthService();
    const user = await authService.verifyJWT(token);

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    let message = 'Invalid or expired token';
    let code = 'UNAUTHORIZED';

    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        message = 'Token has expired';
        code = 'TOKEN_EXPIRED';
      } else if (error.message.includes('Email not verified')) {
        message = 'Email verification required';
        code = 'EMAIL_NOT_VERIFIED';
      } else if (error.message.includes('User not found')) {
        message = 'User account not found';
        code = 'USER_NOT_FOUND';
      }
    }

    res.status(401).json({
      success: false,
      error: {
        code,
        message
      }
    });
  }
};

/**
 * Middleware to optionally authenticate JWT tokens
 * Sets req.user if token is valid, but doesn't fail if no token
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = JWTUtils.extractTokenFromHeader(authHeader);

    if (token) {
      const authService = new AuthService();
      const user = await authService.verifyJWT(token);
      req.user = user;
    }

    next();
  } catch (error) {
    // For optional auth, we don't fail on invalid tokens
    // Just proceed without setting req.user
    next();
  }
};

/**
 * Middleware to check if user's email is verified
 */
export const requireEmailVerification = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      }
    });
    return;
  }

  if (!req.user.emailVerified) {
    res.status(403).json({
      success: false,
      error: {
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Email verification required to access this resource'
      }
    });
    return;
  }

  next();
};

/**
 * Middleware to validate request body against Joi schema
 */
export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
          details: error.details
        }
      });
      return;
    }

    next();
  };
};

/**
 * Rate limiting middleware (simple in-memory implementation)
 */
class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  middleware = (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    
    const requestData = this.requests.get(key);
    
    if (!requestData || now > requestData.resetTime) {
      // New window or expired window
      this.requests.set(key, {
        count: 1,
        resetTime: now + this.windowMs
      });
      next();
      return;
    }

    if (requestData.count >= this.maxRequests) {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later'
        }
      });
      return;
    }

    requestData.count++;
    next();
  };
}

// Export rate limiter instances
// Increased limits for development - 100 requests per 15 minutes for auth endpoints
export const authRateLimit = new RateLimiter(100, 15 * 60 * 1000); 
export const generalRateLimit = new RateLimiter(1000, 15 * 60 * 1000); // 1000 requests per 15 minutes for general endpoints