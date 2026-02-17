-- Add hidden fields to posts for admin moderation
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS hidden_by UUID REFERENCES users(id);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_posts_is_hidden ON posts(is_hidden);
