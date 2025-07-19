import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';
import { User } from '../types';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private transporter!: nodemailer.Transporter;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      const config: EmailConfig = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || ''
        }
      };

      // Validate required environment variables
      if (!config.auth.user || !config.auth.pass) {
        logger.warn('SMTP credentials not configured. Email functionality will be disabled.');
        this.isConfigured = false;
        return;
      }

      this.transporter = nodemailer.createTransport(config);
      this.isConfigured = true;
      
      logger.info('Production email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service:', error as Error);
      this.isConfigured = false;
    }
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.isConfigured) {
      logger.warn('Email service not configured, skipping verification');
      return false;
    }

    try {
      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error('Email service verification failed:', error as Error);
      return false;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured) {
      logger.warn('Email service not configured, cannot send email');
      return false;
    }

    try {
      const mailOptions = {
        from: `"TradeInsight" <${process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html)
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${options.to}`, { messageId: result.messageId });
      return true;
    } catch (error) {
      logger.error(`Failed to send email to ${options.to}:`, error as Error);
      return false;
    }
  }

  async sendVerificationEmail(email: string, verificationToken: string): Promise<boolean> {
    const frontendUrl = process.env.FRONTEND_URL || 'https://trade-insight-frontend.vercel.app';
    const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your Email - TradeInsight</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to TradeInsight!</h1>
          </div>
          <div class="content">
            <h2>Verify Your Email Address</h2>
            <p>Thank you for signing up for TradeInsight. To complete your registration, please verify your email address by clicking the button below:</p>
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p><a href="${verificationUrl}">${verificationUrl}</a></p>
            <p>This verification link will expire in 24 hours.</p>
            <p>If you didn't create an account with TradeInsight, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>© 2024 TradeInsight. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Verify Your Email - TradeInsight',
      html
    });
  }

  /**
   * Send email verification email (User object overload for backward compatibility)
   */
  async sendVerificationEmailToUser(user: User): Promise<void> {
    if (!user.verificationToken) {
      throw new Error('User does not have a verification token');
    }
    
    const success = await this.sendVerificationEmail(user.email, user.verificationToken);
    if (!success) {
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Send password reset email (User object overload for backward compatibility)
   */
  async sendPasswordResetEmailToUser(user: User, resetToken: string): Promise<void> {
    const success = await this.sendPasswordResetEmail(user.email, resetToken);
    if (!success) {
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<boolean> {
    return this.verifyConnection();
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    const frontendUrl = process.env.FRONTEND_URL || 'https://trade-insight-frontend.vercel.app';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset - TradeInsight</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Reset Your Password</h2>
            <p>We received a request to reset your password for your TradeInsight account. Click the button below to reset your password:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            <p>This password reset link will expire in 1 hour.</p>
            <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
          </div>
          <div class="footer">
            <p>© 2024 TradeInsight. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Password Reset - TradeInsight',
      html
    });
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  isReady(): boolean {
    return this.isConfigured;
  }
}

// Export singleton instance
export const emailService = new EmailService();
export const productionEmailService = emailService; // Backward compatibility