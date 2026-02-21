-- Event RSVPs (stored locally, keyed on Google Calendar event ID)
CREATE TABLE IF NOT EXISTS event_rsvps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  google_event_id VARCHAR(500) NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL,
  guest_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(google_event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_rsvps_google_event_id ON event_rsvps(google_event_id);

CREATE TRIGGER update_event_rsvps_updated_at BEFORE UPDATE ON event_rsvps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
