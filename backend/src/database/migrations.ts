import { database } from './connection';
import fs from 'fs';
import path from 'path';

export interface Migration {
  version: number;
  name: string;
  up: string;
  down?: string;
}

export class MigrationManager {
  private migrationsTable = 'schema_migrations';

  constructor() {}

  // Initialize migrations table
  public async initializeMigrationsTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await database.run(sql);
  }

  // Get applied migrations
  public async getAppliedMigrations(): Promise<number[]> {
    await this.initializeMigrationsTable();
    
    const rows = await database.all<{ version: number }>(
      `SELECT version FROM ${this.migrationsTable} ORDER BY version`
    );
    
    return rows.map(row => row.version);
  }

  // Load migrations from directory
  public loadMigrationsFromDirectory(migrationsDir: string): Migration[] {
    if (!fs.existsSync(migrationsDir)) {
      console.log('Migrations directory does not exist:', migrationsDir);
      return [];
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    const migrations: Migration[] = [];

    for (const file of files) {
      const match = file.match(/^(\d+)_(.+)\.sql$/);
      if (!match) {
        console.warn(`Skipping invalid migration file: ${file}`);
        continue;
      }

      const version = parseInt(match[1], 10);
      const name = match[2];
      const filePath = path.join(migrationsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');

      // Split up and down migrations if they exist
      const parts = content.split('-- DOWN');
      const up = parts[0].replace('-- UP', '').trim();
      const down = parts[1] ? parts[1].trim() : undefined;

      const migration: Migration = {
        version,
        name,
        up
      };
      
      if (down) {
        migration.down = down;
      }
      
      migrations.push(migration);
    }

    return migrations;
  }

  // Apply a single migration
  public async applyMigration(migration: Migration): Promise<void> {
    console.log(`Applying migration ${migration.version}: ${migration.name}`);

    await database.transaction(async () => {
      // Execute migration SQL
      const statements = migration.up
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

      for (const statement of statements) {
        await database.run(statement);
      }

      // Record migration as applied
      await database.run(
        `INSERT INTO ${this.migrationsTable} (version, name) VALUES (?, ?)`,
        [migration.version, migration.name]
      );
    });

    console.log(`Migration ${migration.version} applied successfully`);
  }

  // Rollback a single migration
  public async rollbackMigration(migration: Migration): Promise<void> {
    if (!migration.down) {
      throw new Error(`Migration ${migration.version} does not have a rollback script`);
    }

    console.log(`Rolling back migration ${migration.version}: ${migration.name}`);

    await database.transaction(async () => {
      // Execute rollback SQL
      const statements = migration.down!
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

      for (const statement of statements) {
        await database.run(statement);
      }

      // Remove migration record
      await database.run(
        `DELETE FROM ${this.migrationsTable} WHERE version = ?`,
        [migration.version]
      );
    });

    console.log(`Migration ${migration.version} rolled back successfully`);
  }

  // Run all pending migrations
  public async migrate(migrations: Migration[]): Promise<void> {
    const appliedVersions = await this.getAppliedMigrations();
    const pendingMigrations = migrations.filter(
      migration => !appliedVersions.includes(migration.version)
    );

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations');
      return;
    }

    console.log(`Found ${pendingMigrations.length} pending migrations`);

    for (const migration of pendingMigrations) {
      await this.applyMigration(migration);
    }

    console.log('All migrations applied successfully');
  }

  // Rollback to a specific version
  public async rollbackTo(migrations: Migration[], targetVersion: number): Promise<void> {
    const appliedVersions = await this.getAppliedMigrations();
    const migrationsToRollback = migrations
      .filter(migration => appliedVersions.includes(migration.version) && migration.version > targetVersion)
      .sort((a, b) => b.version - a.version); // Rollback in reverse order

    if (migrationsToRollback.length === 0) {
      console.log(`No migrations to rollback to version ${targetVersion}`);
      return;
    }

    console.log(`Rolling back ${migrationsToRollback.length} migrations to version ${targetVersion}`);

    for (const migration of migrationsToRollback) {
      await this.rollbackMigration(migration);
    }

    console.log(`Rollback to version ${targetVersion} completed successfully`);
  }

  // Get migration status
  public async getStatus(migrations: Migration[]): Promise<void> {
    const appliedVersions = await this.getAppliedMigrations();
    
    console.log('\nMigration Status:');
    console.log('=================');
    
    for (const migration of migrations) {
      const status = appliedVersions.includes(migration.version) ? '✓ Applied' : '✗ Pending';
      console.log(`${migration.version.toString().padStart(3, '0')}: ${migration.name.padEnd(30)} ${status}`);
    }
    
    const pendingCount = migrations.filter(m => !appliedVersions.includes(m.version)).length;
    console.log(`\nTotal migrations: ${migrations.length}`);
    console.log(`Applied: ${migrations.length - pendingCount}`);
    console.log(`Pending: ${pendingCount}`);
  }

  // Create a new migration file
  public createMigrationFile(migrationsDir: string, name: string): string {
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }

    const timestamp = Date.now();
    const filename = `${timestamp}_${name.replace(/\s+/g, '_').toLowerCase()}.sql`;
    const filepath = path.join(migrationsDir, filename);

    const template = `-- UP
-- Add your migration SQL here

-- DOWN
-- Add your rollback SQL here (optional)
`;

    fs.writeFileSync(filepath, template);
    console.log(`Created migration file: ${filepath}`);
    
    return filepath;
  }
}

// Export singleton instance
export const migrationManager = new MigrationManager();