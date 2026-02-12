export enum Role {
  MEMBER = 'MEMBER',
  OFFICER = 'OFFICER',
  ADMIN = 'ADMIN',
}

export const ROLE_HIERARCHY = {
  [Role.MEMBER]: 0,
  [Role.OFFICER]: 1,
  [Role.ADMIN]: 2,
};

export function hasMinimumRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
