-- Allow presentation reservations to be made for YouthMember records (children
-- registered under a parent without their own login), in addition to User accounts.

ALTER TABLE presentation_reservations
  ADD COLUMN youth_member_id UUID REFERENCES youth_members(id) ON DELETE CASCADE;

ALTER TABLE presentation_reservations
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE presentation_reservations
  ADD CONSTRAINT presentation_reservations_presenter_check
  CHECK (
    (user_id IS NOT NULL AND youth_member_id IS NULL) OR
    (user_id IS NULL AND youth_member_id IS NOT NULL)
  );

CREATE INDEX idx_presentation_reservations_youth_member
  ON presentation_reservations(youth_member_id);
