import { logger } from './logger';

export interface ProductionCheckResult {
  isReady: boolean;
  checks: {
    [key: string]: {
      status: 'pass' | 'fail' | 'warn';
      message: string;
    };
  };
}

export class ProductionChecker {
  static async runChecks(): Promise<ProductionCheckResult> {
    const checks: ProductionCheckResult['checks'] = {};
    let isReady = true;

    // Check Node environment
    checks.nodeEnv = this.checkNodeEnvironment();
    if (checks.nodeEnv.status === 'fail') isReady = false;

    // Check required environment variables
    checks.envVars = this.checkEnvironmentVariables();
    if (checks.envVars.status === 'fail') isReady = false;

    // Check database configuration
    checks.database = await this.checkDatabaseConfiguration();
    if (checks.database.status === 'fail') isReady = false;

    // Check email configuration
    checks.email = this.checkEmailConfiguration();
    // Email is not critical for basic functionality

    // Check security configuration
    checks.security = this.checkSecurityConfiguration();
    if (checks.security.status === 'fail') isReady = false;

    // Check file system permissions
    checks.fileSystem = this.checkFileSystemPermissions();
    if (checks.fileSystem.status === 'fail') isReady = false;

    return { isReady, checks };
  }

  private static checkNodeEnvironment() {
    const nodeEnv = process.env.NODE_ENV;
    
    if (nodeEnv === 'production') {
      return {
        status: 'pass' as const,
        message: 'Node environment is set to production'
      };
    } else {
      return {
        status: 'warn' as const,
        message: `Node environment is '${nodeEnv}', expected 'production'`
      };
    }
  }

  private static checkEnvironmentVariables() {
    const required = [
      'DATABASE_PATH',
      'JWT_SECRET',
      'FRONTEND_URL'
    ];

    const optional = [
      'SMTP_USER',
      'SMTP_PASS',
      'SMTP_HOST',
      'SMTP_PORT'
    ];

    const missing = required.filter(key => !process.env[key]);
    const missingOptional = optional.filter(key => !process.env[key]);

    if (missing.length > 0) {
      return {
        status: 'fail' as const,
        message: `Missing required environment variables: ${missing.join(', ')}`
      };
    }

    if (missingOptional.length > 0) {
      return {
        status: 'warn' as const,
        message: `Missing optional environment variables: ${missingOptional.join(', ')} (email functionality may be limited)`
      };
    }

    return {
      status: 'pass' as const,
      message: 'All required environment variables are set'
    };
  }

  private static async checkDatabaseConfiguration() {
    try {
      const { database } = require('../database');
      await database.all('SELECT 1');
      
      return {
        status: 'pass' as const,
        message: 'Database connection successful'
      };
    } catch (error) {
      return {
        status: 'fail' as const,
        message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private static checkEmailConfiguration() {
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpHost = process.env.SMTP_HOST;

    if (!smtpUser || !smtpPass || !smtpHost) {
      return {
        status: 'warn' as const,
        message: 'Email configuration incomplete - email functionality will be disabled'
      };
    }

    // Basic validation for Gmail
    if (smtpHost === 'smtp.gmail.com' && (!smtpUser.includes('@gmail.com') || smtpPass.length < 16)) {
      return {
        status: 'warn' as const,
        message: 'Gmail SMTP configuration may be incorrect - ensure app password is used'
      };
    }

    return {
      status: 'pass' as const,
      message: 'Email configuration appears valid'
    };
  }

  private static checkSecurityConfiguration() {
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret || jwtSecret.length < 32) {
      return {
        status: 'fail' as const,
        message: 'JWT_SECRET must be at least 32 characters long for security'
      };
    }

    if (jwtSecret === 'your-super-secret-jwt-key-change-this-in-production') {
      return {
        status: 'fail' as const,
        message: 'JWT_SECRET is using default value - must be changed for production'
      };
    }

    return {
      status: 'pass' as const,
      message: 'Security configuration is valid'
    };
  }

  private static checkFileSystemPermissions() {
    const fs = require('fs');
    const path = require('path');

    try {
      const dbPath = process.env.DATABASE_PATH || './data/tradeinsight.db';
      const dbDir = path.dirname(dbPath);

      // Check if we can create the directory
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Test write permissions
      const testFile = path.join(dbDir, 'test-write.tmp');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);

      return {
        status: 'pass' as const,
        message: 'File system permissions are adequate'
      };
    } catch (error) {
      return {
        status: 'fail' as const,
        message: `File system permission error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  static logResults(result: ProductionCheckResult) {
    logger.info('Production readiness check results:');
    logger.info(`Overall status: ${result.isReady ? 'READY' : 'NOT READY'}`);
    
    Object.entries(result.checks).forEach(([check, result]) => {
      const level = result.status === 'fail' ? 'error' : result.status === 'warn' ? 'warn' : 'info';
      logger[level](`${check}: ${result.message}`);
    });
  }
}