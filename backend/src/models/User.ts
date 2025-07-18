import bcrypt from 'bcrypt';
import { User } from '../types';
import { database } from '../database';
import { v4 as uuidv4 } from 'uuid';

export class UserModel {
  private static readonly SALT_ROUNDS = 12;

  /**
   * Create a new user with hashed password
   */
  static async create(email: string, password: string): Promise<User> {
    const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);
    const verificationToken = uuidv4();
    
    const result = await database.run(
      `INSERT INTO users (email, password_hash, verification_token, email_verified) 
       VALUES (?, ?, ?, ?)`,
      [email, passwordHash, verificationToken, false]
    );

    if (!result.lastID) {
      throw new Error('Failed to create user');
    }

    return this.findById(result.lastID);
  }

  /**
   * Find user by ID
   */
  static async findById(id: number): Promise<User> {
    const row = await database.get(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );

    if (!row) {
      throw new Error('User not found');
    }

    return this.mapRowToUser(row);
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    const row = await database.get(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    return row ? this.mapRowToUser(row) : null;
  }

  /**
   * Find user by verification token
   */
  static async findByVerificationToken(token: string): Promise<User | null> {
    const row = await database.get(
      'SELECT * FROM users WHERE verification_token = ?',
      [token]
    );

    return row ? this.mapRowToUser(row) : null;
  }

  /**
   * Verify user's email
   */
  static async verifyEmail(token: string): Promise<boolean> {
    const result = await database.run(
      `UPDATE users 
       SET email_verified = true, verification_token = NULL, updated_at = CURRENT_TIMESTAMP 
       WHERE verification_token = ?`,
      [token]
    );

    return (result.changes || 0) > 0;
  }

  /**
   * Verify user's email by user ID (development only)
   */
  static async verifyEmailById(userId: number): Promise<boolean> {
    const result = await database.run(
      `UPDATE users 
       SET email_verified = true, verification_token = NULL, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [userId]
    );

    return (result.changes || 0) > 0;
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Update user's password
   */
  static async updatePassword(userId: number, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
    
    await database.run(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [passwordHash, userId]
    );
  }

  /**
   * Check if email exists
   */
  static async emailExists(email: string): Promise<boolean> {
    const row = await database.get(
      'SELECT COUNT(*) as count FROM users WHERE email = ?',
      [email]
    );

    return row.count > 0;
  }

  /**
   * Map database row to User object
   */
  private static mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      emailVerified: Boolean(row.email_verified),
      verificationToken: row.verification_token,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}