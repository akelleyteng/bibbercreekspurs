-- Officer role definitions (dynamic, admin-managed)
CREATE TABLE IF NOT EXISTS officer_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed with standard 4-H officer roles
INSERT INTO officer_roles (name, label, description, sort_order) VALUES
  ('PRESIDENT', 'President', 'Presides over meetings, builds agendas, delegates tasks, and ensures order using parliamentary procedure.', 1),
  ('VICE_PRESIDENT', 'Vice President', 'Fills in for the president, coordinates committees, and introduces guests.', 2),
  ('SECRETARY', 'Secretary', 'Keeps accurate minutes of meetings, records attendance, and handles correspondence.', 3),
  ('TREASURER', 'Treasurer', 'Manages club funds, keeps financial records, and reports on the budget.', 4),
  ('SERGEANT_AT_ARMS', 'Sergeant-at-Arms', 'Maintains order and sets up the room.', 5),
  ('NEWS_REPORTER', 'News Reporter', 'Writes articles about club activities for local media.', 6),
  ('RECREATION_LEADER', 'Recreation/Song Leader', 'Leads games, icebreakers, and songs.', 7),
  ('HISTORIAN', 'Historian', 'Documents the club''s year through photos and scrapbooks.', 8)
ON CONFLICT (name) DO NOTHING;

CREATE TRIGGER update_officer_roles_updated_at BEFORE UPDATE ON officer_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
