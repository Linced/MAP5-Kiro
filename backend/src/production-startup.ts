#!/usr/bin/env node

import { initializeProductionDatabase } from './database/production-init';
import { productionEmailService } from './services/productionEmailService';
import { ProductionChecker } from './utils/productionChecker';

/**
 * Production startup script
 * Handles all initialization tasks required for production deployment
 */
async function productionStartup() {
  console.log('Starting production initialization...');
  
  try {
    // 0. Run production readiness checks
    console.log('Running production readiness checks...');
    const checkResult = await ProductionChecker.runChecks();
    ProductionChecker.logResults(checkResult);
    
    if (!checkResult.isReady) {
      console.error('Production readiness checks failed. Please fix the issues above before deploying.');
      process.exit(1);
    }
    
    // 1. Initialize database
    console.log('Initializing production database...');
    await initializeProductionDatabase();
    
    // 2. Verify email service configuration
    console.log('Verifying email service...');
    const emailReady = await productionEmailService.verifyConnection();
    if (emailReady) {
      console.log('Email service verified successfully');
    } else {
      console.warn('Email service not configured or failed verification');
    }
    
    // 3. Create necessary directories
    console.log('Creating necessary directories...');
    const fs = require('fs');
    const path = require('path');
    
    const directories = [
      path.dirname(process.env.DATABASE_PATH || './data/tradeinsight.db'),
      './logs',
      './uploads'
    ];
    
    for (const dir of directories) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
      }
    }
    
    // 4. Set up demo user for testing
    console.log('Setting up demo user...');
    try {
      const { execSync } = require('child_process');
      execSync('node setup-demo-user.js', { 
        cwd: process.cwd(),
        stdio: 'inherit',
        env: { ...process.env }
      });
      console.log('Demo user setup completed');
    } catch (error) {
      console.warn('Demo user setup failed (non-critical):', error instanceof Error ? error.message : 'Unknown error');
    }
    
    // 5. Log production configuration
    console.log('Production configuration:');
    console.log(`- Node Environment: ${process.env.NODE_ENV}`);
    console.log(`- Port: ${process.env.PORT}`);
    console.log(`- Database Path: ${process.env.DATABASE_PATH}`);
    console.log(`- Frontend URL: ${process.env.FRONTEND_URL}`);
    console.log(`- Email Service: ${emailReady ? 'Configured' : 'Not Configured'}`);
    console.log(`- Demo Account: demo@tradeinsight.com / demo123456`);
    
    console.log('Production initialization completed successfully');
    
  } catch (error) {
    console.error('Production initialization failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  productionStartup()
    .then(() => {
      console.log('Starting main application...');
      // Import and start the main application
      require('./index');
    })
    .catch((error) => {
      console.error('Production startup failed:', error);
      process.exit(1);
    });
}

export { productionStartup };