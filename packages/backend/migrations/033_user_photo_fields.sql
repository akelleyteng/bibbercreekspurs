-- Add horse photo URL and avatar choice to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS horse_photo_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_choice VARCHAR(20) DEFAULT 'initials';
