#!/usr/bin/env node

import { database, migrationManager } from './index';
import path from 'path';

async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  try {
    await database.connect();

    switch (command) {
      case 'init':
        await database.initialize();
        console.log('Database initialized successfully');
        break;

      case 'migrate':
        const migrationsDir = args[0] || path.join(__dirname, 'migrations');
        const migrations = migrationManager.loadMigrationsFromDirectory(migrationsDir);
        await migrationManager.migrate(migrations);
        break;

      case 'rollback':
        const rollbackDir = args[0] || path.join(__dirname, 'migrations');
        const targetVersion = parseInt(args[1], 10);
        if (isNaN(targetVersion)) {
          console.error('Please provide a valid target version number');
          process.exit(1);
        }
        const rollbackMigrations = migrationManager.loadMigrationsFromDirectory(rollbackDir);
        await migrationManager.rollbackTo(rollbackMigrations, targetVersion);
        break;

      case 'status':
        const statusDir = args[0] || path.join(__dirname, 'migrations');
        const statusMigrations = migrationManager.loadMigrationsFromDirectory(statusDir);
        await migrationManager.getStatus(statusMigrations);
        break;

      case 'create':
        const migrationName = args[0];
        if (!migrationName) {
          console.error('Please provide a migration name');
          process.exit(1);
        }
        const createDir = args[1] || path.join(__dirname, 'migrations');
        migrationManager.createMigrationFile(createDir, migrationName);
        break;

      default:
        console.log('Usage:');
        console.log('  tsx src/database/cli.ts init                           - Initialize database');
        console.log('  tsx src/database/cli.ts migrate [migrations_dir]      - Run pending migrations');
        console.log('  tsx src/database/cli.ts rollback [migrations_dir] [version] - Rollback to version');
        console.log('  tsx src/database/cli.ts status [migrations_dir]       - Show migration status');
        console.log('  tsx src/database/cli.ts create [migrations_dir] [name] - Create new migration');
        break;
    }
  } catch (error) {
    console.error('Database operation failed:', error);
    process.exit(1);
  } finally {
    await database.close();
  }
}

if (require.main === module) {
  main();
}