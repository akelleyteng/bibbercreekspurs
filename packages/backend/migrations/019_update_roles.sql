-- Update role values from old system (MEMBER/OFFICER) to new member types (PARENT/ADULT_LEADER)
UPDATE users SET role = 'PARENT' WHERE role = 'MEMBER';
UPDATE users SET role = 'ADULT_LEADER' WHERE role = 'OFFICER';
