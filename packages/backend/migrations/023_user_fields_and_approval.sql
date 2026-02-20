-- Add new user profile fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS horse_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS project VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tshirt_size VARCHAR(20);

-- Add approval workflow column
-- PENDING = new self-registrations awaiting admin review
-- APPROVED = approved by admin or admin-created users
-- DECLINED = rejected by admin
ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) NOT NULL DEFAULT 'APPROVED';

-- Index for filtering pending users quickly
CREATE INDEX IF NOT EXISTS idx_users_approval_status ON users(approval_status);
