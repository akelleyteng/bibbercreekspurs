export enum Role {
  PARENT = 'PARENT',
  ADULT_LEADER = 'ADULT_LEADER',
  YOUTH_MEMBER = 'YOUTH_MEMBER',
  ADMIN = 'ADMIN',
}

export const ROLE_LABELS: Record<Role, string> = {
  [Role.PARENT]: 'Parent',
  [Role.ADULT_LEADER]: 'Adult Leader',
  [Role.YOUTH_MEMBER]: 'Youth Member',
  [Role.ADMIN]: 'Admin',
};

export const ROLE_HIERARCHY = {
  [Role.YOUTH_MEMBER]: 0,
  [Role.PARENT]: 1,
  [Role.ADULT_LEADER]: 2,
  [Role.ADMIN]: 3,
};

export function hasMinimumRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
