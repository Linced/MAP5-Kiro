#!/usr/bin/env node

import { database, migrationManager } from './index';
import path from 'path';
import fs from 'fs';

/**
 * Production database initialization script
 * This script ensures the database is properly set up in production environment
 */
async function initializeProductionDatabase() {
  console.log('Starting production database initialization...');
  
  try {
    // Ensure data directory exists
    const dbPath = process.env.DATABASE_PATH || './data/tradeinsight.db';
    const dataDir = path.dirname(dbPath);
    
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`Created data directory: ${dataDir}`);
    }

    // Connect to database
    await database.connect();
    console.log('Connected to database');

    // Initialize database schema
    await database.initialize();
    console.log('Database schema initialized');

    // Run any pending migrations
    const migrationsDir = path.join(__dirname, 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const migrations = migrationManager.loadMigrationsFromDirectory(migrationsDir);
      await migrationManager.migrate(migrations);
      console.log('Database migrations completed');
    } else {
      console.log('No migrations directory found, skipping migrations');
    }

    // Verify database integrity
    await verifyDatabaseIntegrity();
    console.log('Database integrity verified');

    console.log('Production database initialization completed successfully');
    
  } catch (error) {
    console.error('Production database initialization failed:', error);
    throw error;
  } finally {
    await database.close();
  }
}

/**
 * Verify that all required tables exist and have the correct structure
 */
async function verifyDatabaseIntegrity() {
  const requiredTables = [
    'users',
    'uploads', 
    'data_rows',
    'calculated_columns',
    'strategies',
    'strategy_buckets',
    'tags',
    'strategy_tags'
  ];

  for (const tableName of requiredTables) {
    const result = await database.all(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      [tableName]
    );
    
    if (result.length === 0) {
      throw new Error(`Required table '${tableName}' does not exist`);
    }
  }
  
  console.log(`Verified ${requiredTables.length} required tables exist`);
}

// Run if called directly
if (require.main === module) {
  initializeProductionDatabase()
    .then(() => {
      console.log('Database initialization completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database initialization failed:', error);
      process.exit(1);
    });
}

export { initializeProductionDatabase };