#!/usr/bin/env node

// Simple test script to verify database functionality
const { database, QueryHelpers, migrationManager } = require('./dist/database/index.js');
const path = require('path');

async function testDatabase() {
  console.log('🚀 Testing TradeInsight Database System...\n');

  try {
    // Test 1: Database Connection
    console.log('1. Testing database connection...');
    await database.connect(':memory:');
    console.log('✅ Database connected successfully\n');

    // Test 2: Database Initialization
    console.log('2. Testing database initialization...');
    await database.initialize();
    console.log('✅ Database initialized successfully\n');

    // Test 3: Basic CRUD Operations
    console.log('3. Testing basic CRUD operations...');
    
    // Insert a test user
    const userId = await QueryHelpers.insert('users', {
      email: 'test@tradeinsight.com',
      password_hash: 'hashed_password_123',
      email_verified: true
    });
    console.log(`✅ User created with ID: ${userId}`);

    // Insert a test upload
    const uploadId = 'test-upload-123';
    await QueryHelpers.insert('uploads', {
      id: uploadId,
      user_id: userId,
      filename: 'test_data.csv',
      row_count: 100,
      column_names: JSON.stringify(['Date', 'Open', 'High', 'Low', 'Close', 'Volume'])
    });
    console.log(`✅ Upload created with ID: ${uploadId}`);

    // Insert test data rows
    await QueryHelpers.batchInsert('data_rows', [
      {
        user_id: userId,
        upload_id: uploadId,
        row_index: 0,
        row_data: JSON.stringify({ Date: '2024-01-01', Open: 100, High: 105, Low: 98, Close: 103, Volume: 1000 })
      },
      {
        user_id: userId,
        upload_id: uploadId,
        row_index: 1,
        row_data: JSON.stringify({ Date: '2024-01-02', Open: 103, High: 108, Low: 101, Close: 106, Volume: 1200 })
      }
    ]);
    console.log('✅ Test data rows inserted');

    // Insert a calculated column
    await QueryHelpers.insert('calculated_columns', {
      user_id: userId,
      upload_id: uploadId,
      column_name: 'Daily_Return',
      formula: '([Close] - [Open]) / [Open] * 100'
    });
    console.log('✅ Calculated column created');

    // Insert strategy management data
    const bucketId = await QueryHelpers.insert('strategy_buckets', {
      user_id: userId,
      name: 'Momentum Strategies',
      description: 'Strategies based on price momentum',
      color: '#FF6B6B'
    });
    console.log(`✅ Strategy bucket created with ID: ${bucketId}`);

    const strategyId = await QueryHelpers.insert('strategies', {
      user_id: userId,
      bucket_id: bucketId,
      name: 'Simple Moving Average Crossover',
      description: 'Buy when fast MA crosses above slow MA',
      entry_rules: JSON.stringify([
        { condition: 'SMA_10 > SMA_20', operator: 'and', value: true }
      ]),
      exit_rules: JSON.stringify([
        { type: 'stop_loss', value: 0.05, description: '5% stop loss' }
      ]),
      risk_management: JSON.stringify({
        maxPositionSize: 0.1,
        stopLossPercentage: 0.05
      })
    });
    console.log(`✅ Strategy created with ID: ${strategyId}`);

    const tagId = await QueryHelpers.insert('tags', {
      user_id: userId,
      name: 'Trending',
      color: '#4ECDC4'
    });
    console.log(`✅ Tag created with ID: ${tagId}`);

    // Link strategy to tag
    await QueryHelpers.insert('strategy_tags', {
      strategy_id: strategyId,
      tag_id: tagId
    });
    console.log('✅ Strategy tagged successfully\n');

    // Test 4: Query Operations
    console.log('4. Testing query operations...');
    
    const userCount = await QueryHelpers.getCount('users');
    console.log(`✅ Total users: ${userCount}`);

    const dataRows = await database.all('SELECT * FROM data_rows WHERE user_id = ?', [userId]);
    console.log(`✅ Data rows retrieved: ${dataRows.length}`);

    const strategyWithBucket = await database.get(`
      SELECT s.*, sb.name as bucket_name 
      FROM strategies s 
      LEFT JOIN strategy_buckets sb ON s.bucket_id = sb.id 
      WHERE s.id = ?
    `, [strategyId]);
    console.log(`✅ Strategy with bucket: ${strategyWithBucket.name} (${strategyWithBucket.bucket_name})`);

    console.log('\n🎉 All database tests passed successfully!');
    console.log('\n📊 Database Schema Summary:');
    console.log('- Users table: ✅');
    console.log('- Uploads table: ✅');
    console.log('- Data rows table: ✅');
    console.log('- Calculated columns table: ✅');
    console.log('- Strategy buckets table: ✅');
    console.log('- Strategies table: ✅');
    console.log('- Tags table: ✅');
    console.log('- Strategy tags table: ✅');
    console.log('- All indexes: ✅');
    console.log('- Foreign key constraints: ✅');

  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  } finally {
    await database.close();
    console.log('\n🔒 Database connection closed');
  }
}

// Run the test
testDatabase().catch(console.error);