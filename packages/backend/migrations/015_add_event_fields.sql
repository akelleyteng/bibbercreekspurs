-- Add event_type, external_registration_url, and image_url to events table
ALTER TABLE events ADD COLUMN event_type VARCHAR(20) NOT NULL DEFAULT 'internal';
ALTER TABLE events ADD COLUMN external_registration_url VARCHAR(500);
ALTER TABLE events ADD COLUMN image_url VARCHAR(500);

-- Ensure external events have a registration URL
ALTER TABLE events ADD CONSTRAINT check_external_url
  CHECK (event_type != 'external' OR external_registration_url IS NOT NULL);

-- Index for filtering by event type
CREATE INDEX idx_events_event_type ON events(event_type);
