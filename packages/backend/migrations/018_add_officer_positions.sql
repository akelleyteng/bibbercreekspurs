-- Officer positions table (tracks club officers by year)
CREATE TABLE officer_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  position VARCHAR(50) NOT NULL,
  term_year VARCHAR(9) NOT NULL,
  holder_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  holder_youth_member_id UUID REFERENCES youth_members(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_one_holder CHECK (
    (holder_user_id IS NOT NULL AND holder_youth_member_id IS NULL) OR
    (holder_user_id IS NULL AND holder_youth_member_id IS NOT NULL) OR
    (holder_user_id IS NULL AND holder_youth_member_id IS NULL)
  ),
  CONSTRAINT unique_position_per_year UNIQUE (position, term_year)
);

CREATE INDEX idx_officer_positions_term_year ON officer_positions(term_year);
CREATE INDEX idx_officer_positions_holder_user ON officer_positions(holder_user_id) WHERE holder_user_id IS NOT NULL;
CREATE INDEX idx_officer_positions_holder_youth ON officer_positions(holder_youth_member_id) WHERE holder_youth_member_id IS NOT NULL;

CREATE TRIGGER update_officer_positions_updated_at BEFORE UPDATE ON officer_positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
