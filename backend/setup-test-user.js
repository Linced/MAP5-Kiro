#!/usr/bin/env node

// Script to create a test user for CSV upload testing
const { database, QueryHelpers } = require('./dist/database/index.js');

async function setupTestUser() {
  console.log('🔧 Setting up test user for CSV upload testing...\n');

  try {
    // Connect to database
    await database.connect();
    console.log('✅ Connected to database');

    // Check if test user already exists
    const existingUser = await database.get('SELECT * FROM users WHERE email = ?', ['test@tradeinsight.com']);
    
    if (existingUser) {
      console.log('✅ Test user already exists with ID:', existingUser.id);
    } else {
      // Create test user
      const userId = await QueryHelpers.insert('users', {
        email: 'test@tradeinsight.com',
        password_hash: 'hashed_password_123',
        email_verified: true
      });
      console.log('✅ Test user created with ID:', userId);
    }

    console.log('\n🎉 Test user setup complete!');
    console.log('📝 You can now test CSV uploads using the API');
    console.log('🌐 Server will be available at: http://localhost:3001');
    console.log('📤 Upload endpoint: POST /api/upload/csv');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  } finally {
    await database.close();
  }
}

setupTestUser().catch(console.error);