-- Add minutes file linking to presentation meetings (mirrors agenda columns from 030)
ALTER TABLE presentation_meetings
  ADD COLUMN IF NOT EXISTS minutes_drive_file_id VARCHAR(500),
  ADD COLUMN IF NOT EXISTS minutes_drive_file_name VARCHAR(500),
  ADD COLUMN IF NOT EXISTS minutes_drive_file_url VARCHAR(500);
