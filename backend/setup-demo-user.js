#!/usr/bin/env node

const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/**
 * Script to create a demo user for testing purposes
 */
async function createDemoUser() {
  const dbPath = process.env.DATABASE_PATH || './data/tradeinsight.db';
  
  console.log('Setting up demo user...');
  console.log('Database path:', dbPath);
  
  const db = new sqlite3.Database(dbPath);
  
  try {
    // Demo user credentials
    const demoEmail = 'demo@tradeinsight.com';
    const demoPassword = 'demo123456';
    const hashedPassword = await bcrypt.hash(demoPassword, 12);
    
    // Check if demo user already exists
    const existingUser = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM users WHERE email = ?', [demoEmail], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (existingUser) {
      console.log('Demo user already exists, updating password...');
      
      // Update existing demo user
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE users SET password_hash = ?, email_verified = 1, updated_at = CURRENT_TIMESTAMP WHERE email = ?',
          [hashedPassword, demoEmail],
          function(err) {
            if (err) reject(err);
            else resolve(this);
          }
        );
      });
      
      console.log('Demo user password updated successfully');
    } else {
      console.log('Creating new demo user...');
      
      // Create new demo user
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO users (email, password_hash, email_verified, created_at, updated_at) 
           VALUES (?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [demoEmail, hashedPassword],
          function(err) {
            if (err) reject(err);
            else resolve(this);
          }
        );
      });
      
      console.log('Demo user created successfully');
    }
    
    console.log('Demo account details:');
    console.log('Email:', demoEmail);
    console.log('Password:', demoPassword);
    console.log('Status: Email verified, ready to use');
    
  } catch (error) {
    console.error('Error setting up demo user:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run if called directly
if (require.main === module) {
  createDemoUser()
    .then(() => {
      console.log('Demo user setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Demo user setup failed:', error);
      process.exit(1);
    });
}

module.exports = { createDemoUser };