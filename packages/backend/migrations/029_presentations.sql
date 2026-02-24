-- Presentation meetings: admin-configured meetings with presentation slots
CREATE TABLE IF NOT EXISTS presentation_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_event_id VARCHAR(500) NOT NULL UNIQUE,
  total_slots INTEGER NOT NULL DEFAULT 3,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Member reservations for presentation slots
CREATE TABLE IF NOT EXISTS presentation_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES presentation_meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_presentation_reservations_meeting ON presentation_reservations(meeting_id);
CREATE INDEX idx_presentation_reservations_user ON presentation_reservations(user_id);

-- Presentation files: shared pool of files (slides, images, recordings)
-- A file can be linked to multiple reservations (rollover across events)
CREATE TABLE IF NOT EXISTS presentation_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by UUID NOT NULL REFERENCES users(id),
  drive_file_id VARCHAR(500) NOT NULL,
  drive_file_name VARCHAR(500) NOT NULL,
  drive_file_url VARCHAR(500),
  file_type VARCHAR(20) NOT NULL DEFAULT 'presentation',  -- 'presentation', 'image', 'recording'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_presentation_files_uploaded_by ON presentation_files(uploaded_by);

-- Many-to-many join table: reservations <-> files
CREATE TABLE IF NOT EXISTS presentation_reservation_files (
  reservation_id UUID NOT NULL REFERENCES presentation_reservations(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES presentation_files(id) ON DELETE CASCADE,
  PRIMARY KEY (reservation_id, file_id)
);
