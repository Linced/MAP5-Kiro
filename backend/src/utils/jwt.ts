import jwt, { SignOptions } from 'jsonwebtoken';
import { User } from '../types';

export interface JWTPayload {
  userId: number;
  email: string;
  iat?: number;
  exp?: number;
}

export class JWTUtils {
  private static getSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    return secret;
  }

  private static getExpiresIn(): string | number {
    return process.env.JWT_EXPIRES_IN || '7d';
  }

  /**
   * Generate JWT token for user
   */
  static generateToken(user: User): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email
    };

    const secret = this.getSecret();
    const expiresIn = this.getExpiresIn();
    const options: SignOptions = {
      expiresIn: expiresIn as any
    };

    return jwt.sign(payload, secret, options);
  }

  /**
   * Verify and decode JWT token
   */
  static verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.getSecret()) as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Generate a refresh token (longer expiration)
   */
  static generateRefreshToken(user: User): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email
    };

    const secret = this.getSecret();
    const options: SignOptions = {
      expiresIn: '30d' // Refresh tokens last longer
    };

    return jwt.sign(payload, secret, options);
  }
}