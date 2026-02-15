-- Add event_type, external_registration_url, and image_url to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_type VARCHAR(20) NOT NULL DEFAULT 'internal';
ALTER TABLE events ADD COLUMN IF NOT EXISTS external_registration_url VARCHAR(500);
ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

-- Ensure external events have a registration URL
DO $$ BEGIN
  ALTER TABLE events ADD CONSTRAINT check_external_url
    CHECK (event_type != 'external' OR external_registration_url IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Index for filtering by event type
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
