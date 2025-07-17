// Database utilities exports
export { Database, database } from './connection';
export { QueryBuilder, QueryHelpers, createQueryBuilder } from './queryHelpers';
export { MigrationManager, migrationManager, Migration } from './migrations';

// Re-import database to avoid circular dependency
import { database as db } from './connection';

// Database initialization function
export async function initializeDatabase(dbPath?: string): Promise<void> {
  try {
    // Connect to database
    await db.connect(dbPath);
    
    // Initialize schema
    await db.initialize();
    
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

// Database cleanup function
export async function closeDatabase(): Promise<void> {
  try {
    await db.close();
    console.log('Database connection closed successfully');
  } catch (error) {
    console.error('Error closing database:', error);
    throw error;
  }
}