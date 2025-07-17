import express from 'express';
import Joi from 'joi';
import { AuthService } from '../services/AuthService';
import { validateRequest, authRateLimit, authenticateToken } from '../middleware/auth';

const router = express.Router();
const authService = new AuthService();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(8).max(128).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password must not exceed 128 characters',
    'any.required': 'Password is required'
  })
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  })
});

const verifyEmailSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Verification token is required'
  })
});

const resendVerificationSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  })
});

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', 
  authRateLimit.middleware,
  validateRequest(registerSchema),
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await authService.register(email, password);

      res.status(201).json({
        success: true,
        message: 'Registration successful. Please check your email to verify your account.',
        data: {
          user: {
            id: user.id,
            email: user.email,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt
          }
        }
      });
    } catch (error) {
      console.error('Registration error:', error);

      let statusCode = 400;
      let errorCode = 'REGISTRATION_FAILED';
      let message = 'Registration failed';

      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          statusCode = 409;
          errorCode = 'EMAIL_EXISTS';
          message = 'An account with this email already exists';
        } else if (error.message.includes('Invalid email')) {
          errorCode = 'INVALID_EMAIL';
          message = 'Please provide a valid email address';
        } else if (error.message.includes('Password must be')) {
          errorCode = 'INVALID_PASSWORD';
          message = error.message;
        } else {
          message = error.message;
        }
      }

      res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message
        }
      });
    }
  }
);

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login',
  authRateLimit.middleware,
  validateRequest(loginSchema),
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const result = await authService.login(email, password);

      res.json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      console.error('Login error:', error);

      let statusCode = 401;
      let errorCode = 'LOGIN_FAILED';
      let message = 'Login failed';

      if (error instanceof Error) {
        if (error.message.includes('Invalid email or password')) {
          errorCode = 'INVALID_CREDENTIALS';
          message = 'Invalid email or password';
        } else if (error.message.includes('verify your email')) {
          statusCode = 403;
          errorCode = 'EMAIL_NOT_VERIFIED';
          message = 'Please verify your email before logging in';
        } else if (error.message.includes('Invalid email')) {
          statusCode = 400;
          errorCode = 'INVALID_EMAIL';
          message = 'Please provide a valid email address';
        } else {
          message = error.message;
        }
      }

      res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message
        }
      });
    }
  }
);

/**
 * POST /api/auth/verify-email
 * Verify user's email address
 */
router.post('/verify-email',
  validateRequest(verifyEmailSchema),
  async (req, res) => {
    try {
      const { token } = req.body;

      const success = await authService.verifyEmail(token);

      if (success) {
        res.json({
          success: true,
          message: 'Email verified successfully. You can now log in.'
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'VERIFICATION_FAILED',
            message: 'Email verification failed'
          }
        });
      }
    } catch (error) {
      console.error('Email verification error:', error);

      let statusCode = 400;
      let errorCode = 'VERIFICATION_FAILED';
      let message = 'Email verification failed';

      if (error instanceof Error) {
        if (error.message.includes('Invalid or expired')) {
          errorCode = 'INVALID_TOKEN';
          message = 'Invalid or expired verification token';
        } else {
          message = error.message;
        }
      }

      res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message
        }
      });
    }
  }
);

/**
 * POST /api/auth/resend-verification
 * Resend verification email
 */
router.post('/resend-verification',
  authRateLimit.middleware,
  validateRequest(resendVerificationSchema),
  async (req, res) => {
    try {
      const { email } = req.body;

      await authService.resendVerificationEmail(email);

      res.json({
        success: true,
        message: 'Verification email sent. Please check your inbox.'
      });
    } catch (error) {
      console.error('Resend verification error:', error);

      let statusCode = 400;
      let errorCode = 'RESEND_FAILED';
      let message = 'Failed to resend verification email';

      if (error instanceof Error) {
        if (error.message.includes('User not found')) {
          statusCode = 404;
          errorCode = 'USER_NOT_FOUND';
          message = 'No account found with this email address';
        } else if (error.message.includes('already verified')) {
          statusCode = 409;
          errorCode = 'ALREADY_VERIFIED';
          message = 'Email is already verified';
        } else if (error.message.includes('Invalid email')) {
          errorCode = 'INVALID_EMAIL';
          message = 'Please provide a valid email address';
        } else {
          message = error.message;
        }
      }

      res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message
        }
      });
    }
  }
);

/**
 * GET /api/auth/profile
 * Get current user's profile
 */
router.get('/profile',
  authenticateToken,
  async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        });
      }

      const profile = await authService.getUserProfile(req.user.id);

      return res.json({
        success: true,
        data: {
          user: profile
        }
      });
    } catch (error) {
      console.error('Profile fetch error:', error);

      return res.status(500).json({
        success: false,
        error: {
          code: 'PROFILE_FETCH_FAILED',
          message: 'Failed to fetch user profile'
        }
      });
    }
  }
);

/**
 * POST /api/auth/check-email
 * Check if email exists (for frontend validation)
 */
router.post('/check-email',
  validateRequest(Joi.object({
    email: Joi.string().email().required()
  })),
  async (req, res) => {
    try {
      const { email } = req.body;
      const exists = await authService.emailExists(email);

      res.json({
        success: true,
        data: {
          exists
        }
      });
    } catch (error) {
      console.error('Email check error:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'EMAIL_CHECK_FAILED',
          message: 'Failed to check email availability'
        }
      });
    }
  }
);

export default router;