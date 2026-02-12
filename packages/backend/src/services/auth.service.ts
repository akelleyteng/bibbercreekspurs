import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { getEnvVar } from '../config/env';
import { logger } from '../utils/logger';

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

interface TokenPayload {
  userId: string;
  email?: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

/**
 * Generate a JWT access token for authenticated requests
 * @param userId - User's unique identifier
 * @param email - User's email address
 * @returns JWT access token (expires in 15 minutes)
 */
export function generateAccessToken(userId: string, email: string): string {
  const secret = getEnvVar('JWT_SECRET');

  const payload: TokenPayload = {
    userId,
    email,
    type: 'access',
  };

  const token = jwt.sign(payload, secret, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  logger.debug(`Access token generated for user: ${userId}`);
  return token;
}

/**
 * Generate a JWT refresh token for obtaining new access tokens
 * @param userId - User's unique identifier
 * @returns JWT refresh token (expires in 7 days)
 */
export function generateRefreshToken(userId: string): string {
  const secret = getEnvVar('JWT_REFRESH_SECRET');

  const payload: TokenPayload = {
    userId,
    type: 'refresh',
  };

  const token = jwt.sign(payload, secret, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });

  logger.debug(`Refresh token generated for user: ${userId}`);
  return token;
}

/**
 * Verify and decode a JWT access token
 * @param token - JWT access token to verify
 * @returns Decoded token payload
 * @throws Error if token is invalid, expired, or not an access token
 */
export function verifyAccessToken(token: string): TokenPayload {
  try {
    const secret = getEnvVar('JWT_SECRET');
    const payload = jwt.verify(token, secret) as TokenPayload;

    if (payload.type !== 'access') {
      throw new Error('Invalid token type: expected access token');
    }

    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Access token expired');
      throw new Error('Access token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid access token');
      throw new Error('Invalid access token');
    }
    throw error;
  }
}

/**
 * Verify and decode a JWT refresh token
 * @param token - JWT refresh token to verify
 * @returns Decoded token payload
 * @throws Error if token is invalid, expired, or not a refresh token
 */
export function verifyRefreshToken(token: string): TokenPayload {
  try {
    const secret = getEnvVar('JWT_REFRESH_SECRET');
    const payload = jwt.verify(token, secret) as TokenPayload;

    if (payload.type !== 'refresh') {
      throw new Error('Invalid token type: expected refresh token');
    }

    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Refresh token expired');
      throw new Error('Refresh token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid refresh token');
      throw new Error('Invalid refresh token');
    }
    throw error;
  }
}

/**
 * Hash a plain text password using bcrypt
 * @param plainPassword - Plain text password to hash
 * @returns Bcrypt hash of the password
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  try {
    const hash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
    logger.debug('Password hashed successfully');
    return hash;
  } catch (error) {
    logger.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
}

/**
 * Compare a plain text password with a bcrypt hash
 * @param plainPassword - Plain text password to check
 * @param hashedPassword - Bcrypt hash to compare against
 * @returns True if password matches, false otherwise
 */
export async function comparePassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  try {
    const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
    logger.debug(`Password comparison result: ${isMatch ? 'match' : 'no match'}`);
    return isMatch;
  } catch (error) {
    logger.error('Error comparing password:', error);
    throw new Error('Failed to compare password');
  }
}
