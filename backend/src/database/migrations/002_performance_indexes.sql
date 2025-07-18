-- Performance optimization indexes
-- Migration: 002_performance_indexes.sql

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_data_rows_user_upload ON data_rows(user_id, upload_id);
CREATE INDEX IF NOT EXISTS idx_data_rows_upload_row ON data_rows(upload_id, row_index);

-- Indexes for sorting and filtering operations
CREATE INDEX IF NOT EXISTS idx_uploads_user_date ON uploads(user_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_strategies_user_active ON strategies(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_strategies_bucket_active ON strategies(bucket_id, is_active) WHERE bucket_id IS NOT NULL;

-- Indexes for search operations
CREATE INDEX IF NOT EXISTS idx_strategies_name ON strategies(name);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_strategy_buckets_name ON strategy_buckets(name);

-- Indexes for timestamp-based queries
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_strategies_updated_at ON strategies(updated_at);
CREATE INDEX IF NOT EXISTS idx_calculated_columns_created_at ON calculated_columns(created_at);

-- Partial indexes for common filtered queries
CREATE INDEX IF NOT EXISTS idx_users_verified ON users(email_verified) WHERE email_verified = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_unverified_token ON users(verification_token) WHERE email_verified = FALSE AND verification_token IS NOT NULL;