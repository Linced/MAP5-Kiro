const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Path to the database file
const dbPath = path.join(__dirname, '..', 'data', 'tradeinsight.db');

// Demo account email
const DEMO_EMAIL = 'demo@tradeinsight.com';

// Open the database
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log(`Connected to the database at ${dbPath}`);
});

// Function to verify the demo user
async function verifyDemoUser() {
  return new Promise((resolve, reject) => {
    // First, check if the user exists
    db.get('SELECT * FROM users WHERE email = ?', [DEMO_EMAIL], (err, row) => {
      if (err) {
        console.error('Error checking user:', err.message);
        reject(err);
        return;
      }

      if (!row) {
        console.log(`User ${DEMO_EMAIL} does not exist. Creating demo user...`);
        
        // Create a new demo user with a known password hash (for "Demo123!")
        // This is a bcrypt hash for "Demo123!" with 12 rounds
        const passwordHash = '$2b$12$8NwX.OLrECrKa3TL1KYsZeYJeJ0zJrN9YQI9C1aYsF9rF.3qP3Ot2';
        
        db.run(
          `INSERT INTO users (email, password_hash, email_verified, created_at, updated_at) 
           VALUES (?, ?, 1, datetime('now'), datetime('now'))`,
          [DEMO_EMAIL, passwordHash],
          function(err) {
            if (err) {
              console.error('Error creating demo user:', err.message);
              reject(err);
              return;
            }
            
            console.log(`Demo user created with ID: ${this.lastID}`);
            console.log('Email verification set to TRUE');
            resolve(true);
          }
        );
      } else {
        console.log(`User ${DEMO_EMAIL} exists with ID: ${row.id}`);
        console.log(`Current email verification status: ${row.email_verified ? 'Verified' : 'Not Verified'}`);
        
        // Update the user to set email_verified to true
        db.run(
          `UPDATE users 
           SET email_verified = 1, 
               verification_token = NULL, 
               updated_at = datetime('now') 
           WHERE email = ?`,
          [DEMO_EMAIL],
          function(err) {
            if (err) {
              console.error('Error updating user:', err.message);
              reject(err);
              return;
            }
            
            console.log(`Updated ${this.changes} row(s)`);
            console.log('Email verification set to TRUE');
            resolve(true);
          }
        );
      }
    });
  });
}

// Execute the function and close the database
verifyDemoUser()
  .then(() => {
    console.log('Demo user verification completed successfully');
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed');
      }
    });
  })
  .catch((err) => {
    console.error('Error verifying demo user:', err);
    db.close();
    process.exit(1);
  });