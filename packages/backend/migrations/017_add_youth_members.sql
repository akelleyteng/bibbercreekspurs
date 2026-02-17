-- Youth members table (children linked to parent/guardian users)
CREATE TABLE youth_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  birthdate DATE,
  project VARCHAR(255),
  horse_names VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_youth_members_parent ON youth_members(parent_user_id);

CREATE TRIGGER update_youth_members_updated_at BEFORE UPDATE ON youth_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
