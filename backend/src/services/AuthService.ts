import { User, AuthResult, AuthService as IAuthService } from '../types';
import { UserModel } from '../models/User';
import { JWTUtils } from '../utils/jwt';
import { EmailService } from './EmailService';
import Joi from 'joi';

export class AuthService implements IAuthService {
  // Validation schemas
  private static readonly emailSchema = Joi.string().email().required();
  private static readonly passwordSchema = Joi.string().min(8).max(128).required();

  /**
   * Register a new user
   */
  async register(email: string, password: string): Promise<User> {
    // Validate input
    const { error: emailError } = AuthService.emailSchema.validate(email);
    if (emailError) {
      throw new Error('Invalid email format');
    }

    const { error: passwordError } = AuthService.passwordSchema.validate(password);
    if (passwordError) {
      throw new Error('Password must be between 8 and 128 characters');
    }

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create user
    const user = await UserModel.create(email, password);

    // Send verification email
    try {
      await EmailService.sendVerificationEmail(user);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      // Don't fail registration if email fails, but log the error
    }

    return user;
  }

  /**
   * Login user with email and password
   */
  async login(email: string, password: string): Promise<AuthResult> {
    // Validate input
    const { error: emailError } = AuthService.emailSchema.validate(email);
    if (emailError) {
      throw new Error('Invalid email format');
    }

    if (!password) {
      throw new Error('Password is required');
    }

    // Find user by email
    const user = await UserModel.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await UserModel.verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw new Error('Please verify your email before logging in');
    }

    // Generate JWT token
    const token = JWTUtils.generateToken(user);

    // Return user without sensitive data
    const { passwordHash, verificationToken, ...userWithoutSensitiveData } = user;

    return {
      user: userWithoutSensitiveData,
      token
    };
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<boolean> {
    if (!token) {
      throw new Error('Verification token is required');
    }

    // Find user by verification token
    const user = await UserModel.findByVerificationToken(token);
    if (!user) {
      throw new Error('Invalid or expired verification token');
    }

    // Check if already verified
    if (user.emailVerified) {
      return true; // Already verified, return success
    }

    // Verify email
    const success = await UserModel.verifyEmail(token);
    if (!success) {
      throw new Error('Failed to verify email');
    }

    return true;
  }

  /**
   * Generate JWT token for user
   */
  generateJWT(userId: number): string {
    // This method is kept for interface compatibility
    // In practice, we use the user object to generate tokens
    console.warn(`generateJWT called with userId ${userId} - use login method instead`);
    throw new Error('Use login method to generate tokens with full user context');
  }

  /**
   * Verify JWT token and return user
   */
  async verifyJWT(token: string): Promise<User> {
    if (!token) {
      throw new Error('Token is required');
    }

    try {
      // Verify and decode token
      const payload = JWTUtils.verifyToken(token);

      // Find user by ID from token
      const user = await UserModel.findById(payload.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if email is verified
      if (!user.emailVerified) {
        throw new Error('Email not verified');
      }

      return user;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Token verification failed');
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<void> {
    // Validate email
    const { error } = AuthService.emailSchema.validate(email);
    if (error) {
      throw new Error('Invalid email format');
    }

    // Find user
    const user = await UserModel.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if already verified
    if (user.emailVerified) {
      throw new Error('Email is already verified');
    }

    // Send verification email
    await EmailService.sendVerificationEmail(user);
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: number): Promise<Omit<User, 'passwordHash' | 'verificationToken'>> {
    const user = await UserModel.findById(userId);
    const { passwordHash, verificationToken, ...userProfile } = user;
    return userProfile;
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const { error } = AuthService.emailSchema.validate(email);
    if (error) {
      return false;
    }

    return UserModel.emailExists(email);
  }
}