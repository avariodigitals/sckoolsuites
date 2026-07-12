-- Fix: create user_privilege table with correct INTEGER type for user_id
-- Run with: psql "$DATABASE_URL" -f scripts/fix-user-privilege.sql

-- Drop if a broken version exists (will fail safely if it doesn't exist)
DROP TABLE IF EXISTS user_privilege;

-- Create with INTEGER user_id to match "user".id
CREATE TABLE user_privilege (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    privilege_id INTEGER NOT NULL REFERENCES privilege(id) ON DELETE CASCADE,
    is_granted BOOLEAN DEFAULT true,
    granted_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, privilege_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_privilege_user_id ON user_privilege(user_id);
CREATE INDEX IF NOT EXISTS idx_user_privilege_privilege_id ON user_privilege(privilege_id);

-- Confirm
SELECT 'user_privilege table created successfully' as status;
