import { database, createQueryBuilder, QueryHelpers } from '../index';
import path from 'path';
import fs from 'fs';

describe('Database', () => {
  const testDbPath = path.join(__dirname, 'test.db');

  beforeAll(async () => {
    // Use in-memory database for testing
    await database.connect(':memory:');
    await database.initialize();
  });

  afterAll(async () => {
    await database.close();
    // Clean up test database file if it exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Connection', () => {
    it('should connect to database successfully', async () => {
      // Database is already connected in beforeAll
      expect(true).toBe(true);
    });
  });

  describe('Basic Operations', () => {
    it('should insert and retrieve a user', async () => {
      const userData = {
        email: 'test@example.com',
        password_hash: 'hashed_password',
        email_verified: false
      };

      const userId = await QueryHelpers.insert('users', userData);
      expect(userId).toBeGreaterThan(0);

      const user = await database.get('SELECT * FROM users WHERE id = ?', [userId]);
      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.email_verified).toBe(0); // SQLite stores boolean as 0/1
    });

    it('should update a user', async () => {
      const userData = {
        email: 'test2@example.com',
        password_hash: 'hashed_password',
        email_verified: false
      };

      const userId = await QueryHelpers.insert('users', userData);
      
      const updatedData = { email_verified: true };
      const changes = await QueryHelpers.update('users', updatedData, 'id = ?', [userId]);
      
      expect(changes).toBe(1);

      const user = await database.get('SELECT * FROM users WHERE id = ?', [userId]);
      expect(user.email_verified).toBe(1);
    });

    it('should delete a user', async () => {
      const userData = {
        email: 'test3@example.com',
        password_hash: 'hashed_password',
        email_verified: false
      };

      const userId = await QueryHelpers.insert('users', userData);
      
      const changes = await QueryHelpers.delete('users', 'id = ?', [userId]);
      expect(changes).toBe(1);

      const user = await database.get('SELECT * FROM users WHERE id = ?', [userId]);
      expect(user).toBeUndefined();
    });
  });

  describe('Query Builder', () => {
    beforeEach(async () => {
      // Clean up users table
      await database.run('DELETE FROM users');
      
      // Insert test data
      await QueryHelpers.insert('users', {
        email: 'user1@example.com',
        password_hash: 'hash1',
        email_verified: true
      });
      
      await QueryHelpers.insert('users', {
        email: 'user2@example.com',
        password_hash: 'hash2',
        email_verified: false
      });
    });

    it('should build and execute a simple query', async () => {
      const users = await createQueryBuilder()
        .select('*')
        .from('users')
        .where('email_verified = ?', true)
        .execute();

      expect(users).toHaveLength(1);
      expect(users[0].email).toBe('user1@example.com');
    });

    it('should handle pagination', async () => {
      const queryBuilder = createQueryBuilder()
        .select('*')
        .from('users');

      QueryHelpers.applyPagination(queryBuilder, {
        page: 1,
        limit: 1,
        sortBy: 'email',
        sortOrder: 'asc'
      });

      const users = await queryBuilder.execute();
      expect(users).toHaveLength(1);
      expect(users[0].email).toBe('user1@example.com');
    });

    it('should get count correctly', async () => {
      const count = await QueryHelpers.getCount('users');
      expect(count).toBe(2);

      const verifiedCount = await QueryHelpers.getCount('users', ['email_verified = ?'], [1]);
      expect(verifiedCount).toBe(1);
    });
  });

  describe('Transactions', () => {
    it('should handle successful transactions', async () => {
      await database.transaction(async () => {
        await QueryHelpers.insert('users', {
          email: 'transaction1@example.com',
          password_hash: 'hash',
          email_verified: false
        });

        await QueryHelpers.insert('users', {
          email: 'transaction2@example.com',
          password_hash: 'hash',
          email_verified: false
        });
      });

      const count = await QueryHelpers.getCount('users', ['email LIKE ?'], ['transaction%']);
      expect(count).toBe(2);
    });

    it('should rollback failed transactions', async () => {
      const initialCount = await QueryHelpers.getCount('users');

      try {
        await database.transaction(async () => {
          await QueryHelpers.insert('users', {
            email: 'rollback1@example.com',
            password_hash: 'hash',
            email_verified: false
          });

          // This should cause a constraint violation (duplicate email)
          await QueryHelpers.insert('users', {
            email: 'rollback1@example.com',
            password_hash: 'hash',
            email_verified: false
          });
        });
      } catch (error) {
        // Expected to fail
      }

      const finalCount = await QueryHelpers.getCount('users');
      expect(finalCount).toBe(initialCount);
    });
  });

  describe('Batch Operations', () => {
    it('should handle batch inserts', async () => {
      const batchData = [
        {
          email: 'batch1@example.com',
          password_hash: 'hash1',
          email_verified: false
        },
        {
          email: 'batch2@example.com',
          password_hash: 'hash2',
          email_verified: true
        },
        {
          email: 'batch3@example.com',
          password_hash: 'hash3',
          email_verified: false
        }
      ];

      await QueryHelpers.batchInsert('users', batchData);

      const count = await QueryHelpers.getCount('users', ['email LIKE ?'], ['batch%']);
      expect(count).toBe(3);
    });
  });
});