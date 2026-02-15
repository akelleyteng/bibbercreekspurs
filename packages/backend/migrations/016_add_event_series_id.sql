-- Add series_id to link recurring event instances
ALTER TABLE events ADD COLUMN IF NOT EXISTS series_id UUID;

-- Index for efficient series lookups
CREATE INDEX IF NOT EXISTS idx_events_series_id ON events(series_id) WHERE series_id IS NOT NULL;
