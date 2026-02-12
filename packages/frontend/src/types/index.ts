// Local type definitions for the frontend prototype
// These match the shared types but are defined locally to avoid dependency issues

export enum Role {
  MEMBER = 'MEMBER',
  OFFICER = 'OFFICER',
  ADMIN = 'ADMIN',
}

export enum Visibility {
  PUBLIC = 'PUBLIC',
  MEMBER_ONLY = 'MEMBER_ONLY',
}

export enum ReactionType {
  LIKE = 'LIKE',
  HEART = 'HEART',
  CELEBRATE = 'CELEBRATE',
  SUPPORT = 'SUPPORT',
}

export enum RegistrationStatus {
  REGISTERED = 'REGISTERED',
  WAITLISTED = 'WAITLISTED',
  CANCELLED = 'CANCELLED',
}
