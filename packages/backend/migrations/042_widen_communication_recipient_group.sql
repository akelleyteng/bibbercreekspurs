-- Widen recipient_group to hold comma-joined multi-group selections
-- (e.g., "PARENTS,ADULT_LEADERS"). Previous VARCHAR(50) was too narrow.
ALTER TABLE admin_communications
  ALTER COLUMN recipient_group TYPE TEXT;
