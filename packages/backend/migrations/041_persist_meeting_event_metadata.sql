-- Persist Google Calendar event metadata on presentation_meetings so past
-- meetings remain visible/searchable even if the calendar invite is deleted
-- or falls outside the upcoming-events window.

ALTER TABLE presentation_meetings
  ADD COLUMN event_title VARCHAR(500),
  ADD COLUMN event_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN event_location VARCHAR(500);

CREATE INDEX idx_presentation_meetings_event_date
  ON presentation_meetings(event_date DESC NULLS LAST);
