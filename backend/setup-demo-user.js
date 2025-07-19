const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function createDemoUser() {
  const dbPath = path.join(__dirname, 'data', 'tradeinsight.db');
  
  console.log('🔧 Setting up demo and test users...');
  console.log('📁 Database path:', dbPath);

  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Error opening database:', err.message);
      return;
    }
    console.log('✅ Connected to SQLite database');
  });

  try {
    // Create users table if it doesn't exist (using correct schema)
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          email_verified BOOLEAN DEFAULT FALSE,
          verification_token TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('✅ Users table ready');

    // Hash the password
    const hashedPassword = await bcrypt.hash('demo123456', 10);
    console.log('🔐 Password hashed');

    // Insert or update demo user
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT OR REPLACE INTO users (email, password_hash, email_verified)
        VALUES (?, ?, 1)
      `, ['demo@tradeinsight.com', hashedPassword], function(err) {
        if (err) reject(err);
        else {
          console.log('✅ Demo user created/updated');
          console.log('📧 Email: demo@tradeinsight.com');
          console.log('🔑 Password: demo123456');
          resolve();
        }
      });
    });

    // Insert or update test user
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT OR REPLACE INTO users (email, password_hash, email_verified)
        VALUES (?, ?, 1)
      `, ['test@tradeinsight.com', hashedPassword], function(err) {
        if (err) reject(err);
        else {
          console.log('✅ Test user created/updated');
          console.log('📧 Email: test@tradeinsight.com');
          console.log('🔑 Password: demo123456');
          resolve();
        }
      });
    });

    // Verify the users were created
    await new Promise((resolve, reject) => {
      db.all('SELECT id, email, email_verified FROM users WHERE email IN (?, ?)', 
        ['demo@tradeinsight.com', 'test@tradeinsight.com'], (err, rows) => {
        if (err) reject(err);
        else {
          console.log('✅ Users verified:', rows);
          resolve();
        }
      });
    });

  } catch (error) {
    console.error('❌ Error creating demo user:', error);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err.message);
      } else {
        console.log('✅ Database connection closed');
      }
    });
  }
}

createDemoUser();