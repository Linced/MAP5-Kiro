-- UP
-- Initial schema migration for TradeInsight MVP

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Upload metadata
CREATE TABLE IF NOT EXISTS uploads (
  id TEXT PRIMARY KEY, -- UUID
  user_id INTEGER NOT NULL,
  filename TEXT NOT NULL,
  row_count INTEGER NOT NULL,
  column_names TEXT NOT NULL, -- JSON array
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Data rows table (flexible JSON storage)
CREATE TABLE IF NOT EXISTS data_rows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  upload_id TEXT NOT NULL,
  row_index INTEGER NOT NULL,
  row_data TEXT NOT NULL, -- JSON string
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE
);

-- Calculated columns
CREATE TABLE IF NOT EXISTS calculated_columns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  upload_id TEXT NOT NULL,
  column_name TEXT NOT NULL,
  formula TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE
);

-- Strategy buckets/categories
CREATE TABLE IF NOT EXISTS strategy_buckets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT, -- Hex color for UI
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Trading strategies
CREATE TABLE IF NOT EXISTS strategies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  bucket_id INTEGER,
  name TEXT NOT NULL,
  description TEXT,
  entry_rules TEXT, -- JSON string with entry conditions
  exit_rules TEXT, -- JSON string with exit conditions
  risk_management TEXT, -- JSON string with risk parameters
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (bucket_id) REFERENCES strategy_buckets(id) ON DELETE SET NULL
);

-- Tags for strategies
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  color TEXT, -- Hex color for UI
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, name)
);

-- Many-to-many relationship between strategies and tags
CREATE TABLE IF NOT EXISTS strategy_tags (
  strategy_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (strategy_id, tag_id),
  FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_uploads_user_id ON uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_data_rows_user_id ON data_rows(user_id);
CREATE INDEX IF NOT EXISTS idx_data_rows_upload_id ON data_rows(upload_id);
CREATE INDEX IF NOT EXISTS idx_calculated_columns_user_id ON calculated_columns(user_id);
CREATE INDEX IF NOT EXISTS idx_calculated_columns_upload_id ON calculated_columns(upload_id);
CREATE INDEX IF NOT EXISTS idx_strategy_buckets_user_id ON strategy_buckets(user_id);
CREATE INDEX IF NOT EXISTS idx_strategies_user_id ON strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_strategies_bucket_id ON strategies(bucket_id);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_strategy_tags_strategy_id ON strategy_tags(strategy_id);
CREATE INDEX IF NOT EXISTS idx_strategy_tags_tag_id ON strategy_tags(tag_id);

-- DOWN
-- Drop all tables and indexes in reverse order

DROP INDEX IF EXISTS idx_strategy_tags_tag_id;
DROP INDEX IF EXISTS idx_strategy_tags_strategy_id;
DROP INDEX IF EXISTS idx_tags_user_id;
DROP INDEX IF EXISTS idx_strategies_bucket_id;
DROP INDEX IF EXISTS idx_strategies_user_id;
DROP INDEX IF EXISTS idx_strategy_buckets_user_id;
DROP INDEX IF EXISTS idx_calculated_columns_upload_id;
DROP INDEX IF EXISTS idx_calculated_columns_user_id;
DROP INDEX IF EXISTS idx_data_rows_upload_id;
DROP INDEX IF EXISTS idx_data_rows_user_id;
DROP INDEX IF EXISTS idx_uploads_user_id;
DROP INDEX IF EXISTS idx_users_email;

DROP TABLE IF EXISTS strategy_tags;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS strategies;
DROP TABLE IF EXISTS strategy_buckets;
DROP TABLE IF EXISTS calculated_columns;
DROP TABLE IF EXISTS data_rows;
DROP TABLE IF EXISTS uploads;
DROP TABLE IF EXISTS users;