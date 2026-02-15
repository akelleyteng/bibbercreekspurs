-- Add password_reset_required column to users table
-- This flag forces users to change their password on first login

ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_reset_required BOOLEAN DEFAULT FALSE;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_password_reset ON users(password_reset_required);

-- Set the flag to true for any users with default passwords
-- (This is a safety measure for bulk imports)
COMMENT ON COLUMN users.password_reset_required IS 'If true, user must change password on next login';
