import { Role } from '../enums/roles.enum';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  profileImageUrl?: string;
  bio?: string;
  joinDate: Date;
  lastLogin?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile extends Omit<User, 'passwordHash'> {
  // Public profile view (excludes sensitive data)
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  bio?: string;
  profileImageUrl?: string;
}

export interface ChangeRoleRequest {
  userId: string;
  newRole: Role;
}
