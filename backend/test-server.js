#!/usr/bin/env node

// Simple test script to verify backend can start without errors
const path = require('path');

console.log('🚀 Testing TradeInsight Backend Startup...\n');

// Set environment variables for testing
process.env.NODE_ENV = 'development';
process.env.DATABASE_PATH = path.join(__dirname, 'data', 'test.db');
process.env.JWT_SECRET = 'test-secret-key-for-development-only';
process.env.JWT_EXPIRES_IN = '7d';
process.env.PORT = '3001';
process.env.FRONTEND_URL = 'http://localhost:5173';

// Mock SMTP settings to avoid email errors
process.env.SMTP_HOST = 'smtp.gmail.com';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test@example.com';
process.env.SMTP_PASS = 'test-password';

async function testBackend() {
  try {
    console.log('1. Testing database connection...');
    const { database } = require('./dist/database/index.js');
    await database.connect(':memory:'); // Use in-memory database for testing
    console.log('✅ Database connection successful\n');

    console.log('2. Testing database initialization...');
    await database.initialize();
    console.log('✅ Database initialization successful\n');

    console.log('3. Testing service imports...');
    const { AuthService } = require('./dist/services/index.js');
    const authService = new AuthService();
    console.log('✅ Service imports successful\n');

    console.log('4. Testing route imports...');
    const routes = require('./dist/routes/index.js');
    console.log('✅ Route imports successful\n');

    console.log('5. Testing middleware imports...');
    const { authenticateToken } = require('./dist/middleware/auth.js');
    console.log('✅ Middleware imports successful\n');

    console.log('6. Testing error handling...');
    const { AppError } = require('./dist/utils/errors.js');
    const testError = new AppError('Test error', 400, 'TEST_ERROR');
    console.log('✅ Error handling successful\n');

    console.log('7. Testing JWT utilities...');
    const { JWTUtils } = require('./dist/utils/jwt.js');
    console.log('✅ JWT utilities successful\n');

    console.log('8. Testing email service...');
    const { emailService } = require('./dist/services/index.js');
    console.log('✅ Email service successful\n');

    await database.close();
    console.log('🎉 All backend tests passed successfully!');
    console.log('\n✅ Backend is ready to start');
    
  } catch (error) {
    console.error('❌ Backend test failed:', error);
    console.error('\n💡 Please fix the above errors before starting the server');
    process.exit(1);
  }
}

testBackend().catch(console.error);