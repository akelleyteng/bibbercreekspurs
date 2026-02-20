-- Many-to-many parent↔youth user account linking
CREATE TABLE IF NOT EXISTS family_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(parent_user_id, child_user_id)
);
CREATE INDEX IF NOT EXISTS idx_family_links_parent ON family_links(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_family_links_child ON family_links(child_user_id);

-- Link youth_members records to user accounts (nullable — filled when youth creates account)
ALTER TABLE youth_members ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_youth_members_user ON youth_members(user_id);
