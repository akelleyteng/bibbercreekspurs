-- Add device tracking column (last_login already exists from 001_initial_schema.sql)
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_device VARCHAR(255);
