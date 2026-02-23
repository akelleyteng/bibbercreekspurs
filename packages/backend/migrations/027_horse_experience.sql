-- Add horse_experience column to users and youth_members
ALTER TABLE users ADD COLUMN IF NOT EXISTS horse_experience VARCHAR(50);
ALTER TABLE youth_members ADD COLUMN IF NOT EXISTS horse_experience VARCHAR(50);
