-- Add missing user contact fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_phone VARCHAR(20);

-- Rename profile_image_url to profile_photo_url for consistency
ALTER TABLE users RENAME COLUMN profile_image_url TO profile_photo_url;

-- Add indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
