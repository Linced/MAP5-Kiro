const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

// Configuration
const DEMO_EMAIL = 'demo@tradeinsight.com';
const DEMO_PASSWORD = 'Demo123!';
const SALT_ROUNDS = 12;

// Determine database path
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'tradeinsight.db');

console.log(`Using database at: ${dbPath}`);

// Check if database exists
if (!fs.existsSync(dbPath)) {
  console.error(`Database file not found at: ${dbPath}`);
  console.log('Creating data directory if it doesn\'t exist...');
  
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`Created directory: ${dataDir}`);
  }
}

// Connect to the database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the SQLite database.');
});

// Create tables if they don't exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email_verified INTEGER DEFAULT 0,
      verification_token TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating users table:', err.message);
      return;
    }
    console.log('Users table ready.');
    
    // Check if demo user exists
    db.get('SELECT * FROM users WHERE email = ?', [DEMO_EMAIL], async (err, row) => {
      if (err) {
        console.error('Error checking for demo user:', err.message);
        closeDb();
        return;
      }
      
      if (row) {
        console.log('Demo user already exists.');
        
        // Update the user to be verified
        db.run(
          'UPDATE users SET email_verified = 1, verification_token = NULL, updated_at = CURRENT_TIMESTAMP WHERE email = ?',
          [DEMO_EMAIL],
          function(err) {
            if (err) {
              console.error('Error updating demo user:', err.message);
              closeDb();
              return;
            }
            
            console.log(`Demo user verified successfully. Changes: ${this.changes}`);
            
            // Update password if needed
            bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS, (err, hash) => {
              if (err) {
                console.error('Error hashing password:', err.message);
                closeDb();
                return;
              }
              
              db.run(
                'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?',
                [hash, DEMO_EMAIL],
                function(err) {
                  if (err) {
                    console.error('Error updating password:', err.message);
                    closeDb();
                    return;
                  }
                  
                  console.log(`Demo user password updated. Changes: ${this.changes}`);
                  console.log('\nDemo account is ready to use:');
                  console.log(`Email: ${DEMO_EMAIL}`);
                  console.log(`Password: ${DEMO_PASSWORD}`);
                  closeDb();
                }
              );
            });
          }
        );
      } else {
        console.log('Demo user does not exist. Creating...');
        
        // Create a new demo user
        bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS, (err, hash) => {
          if (err) {
            console.error('Error hashing password:', err.message);
            closeDb();
            return;
          }
          
          db.run(
            'INSERT INTO users (email, password_hash, email_verified) VALUES (?, ?, 1)',
            [DEMO_EMAIL, hash],
            function(err) {
              if (err) {
                console.error('Error creating demo user:', err.message);
                closeDb();
                return;
              }
              
              console.log(`Demo user created with ID: ${this.lastID}`);
              console.log('\nDemo account is ready to use:');
              console.log(`Email: ${DEMO_EMAIL}`);
              console.log(`Password: ${DEMO_PASSWORD}`);
              closeDb();
            }
          );
        });
      }
    });
  });
});

// Function to close the database connection
function closeDb() {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
  });
}