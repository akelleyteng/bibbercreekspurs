-- Add agenda file linking to presentation meetings
ALTER TABLE presentation_meetings
  ADD COLUMN IF NOT EXISTS agenda_drive_file_id VARCHAR(500),
  ADD COLUMN IF NOT EXISTS agenda_drive_file_name VARCHAR(500),
  ADD COLUMN IF NOT EXISTS agenda_drive_file_url VARCHAR(500);
