import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashPassword,
  comparePassword,
} from '../../src/services/auth.service';
import jwt from 'jsonwebtoken';

describe('Auth Service - Unit Tests', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockEmail = 'test@example.com';
  const mockPassword = 'SecurePass123!';
  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
  const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

  describe('generateAccessToken', () => {
    it('should generate a valid JWT access token', () => {
      const token = generateAccessToken(mockUserId, mockEmail);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      // Verify token structure
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      expect(decoded.userId).toBe(mockUserId);
      expect(decoded.email).toBe(mockEmail);
      expect(decoded.type).toBe('access');
    });

    it('should create token with 15 minute expiry', () => {
      const token = generateAccessToken(mockUserId, mockEmail);
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      const now = Math.floor(Date.now() / 1000);
      const expectedExpiry = now + (15 * 60); // 15 minutes

      // Allow 2 second tolerance for test execution time
      expect(decoded.exp).toBeGreaterThanOrEqual(expectedExpiry - 2);
      expect(decoded.exp).toBeLessThanOrEqual(expectedExpiry + 2);
    });

    it('should include issued at timestamp', () => {
      const token = generateAccessToken(mockUserId, mockEmail);
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      expect(decoded.iat).toBeDefined();
      expect(typeof decoded.iat).toBe('number');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid JWT refresh token', () => {
      const token = generateRefreshToken(mockUserId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as any;
      expect(decoded.userId).toBe(mockUserId);
      expect(decoded.type).toBe('refresh');
    });

    it('should create token with 7 day expiry', () => {
      const token = generateRefreshToken(mockUserId);
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as any;

      const now = Math.floor(Date.now() / 1000);
      const expectedExpiry = now + (7 * 24 * 60 * 60); // 7 days

      // Allow 2 second tolerance
      expect(decoded.exp).toBeGreaterThanOrEqual(expectedExpiry - 2);
      expect(decoded.exp).toBeLessThanOrEqual(expectedExpiry + 2);
    });
  });

  describe('verifyAccessToken', () => {
    it('should return decoded payload for valid access token', () => {
      const token = generateAccessToken(mockUserId, mockEmail);
      const payload = verifyAccessToken(token);

      expect(payload.userId).toBe(mockUserId);
      expect(payload.email).toBe(mockEmail);
      expect(payload.type).toBe('access');
    });

    it('should throw error for expired access token', () => {
      // Create token that expires immediately
      const expiredToken = jwt.sign(
        { userId: mockUserId, email: mockEmail, type: 'access' },
        JWT_SECRET,
        { expiresIn: '0s' }
      );

      // Wait a moment to ensure expiry
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(() => verifyAccessToken(expiredToken)).toThrow();
          resolve();
        }, 100);
      });
    });

    it('should throw error for invalid signature', () => {
      const token = jwt.sign(
        { userId: mockUserId, email: mockEmail, type: 'access' },
        'wrong-secret',
        { expiresIn: '15m' }
      );

      expect(() => verifyAccessToken(token)).toThrow();
    });

    it('should throw error for malformed token', () => {
      expect(() => verifyAccessToken('invalid.token.here')).toThrow();
    });

    it('should throw error for refresh token passed to access verification', () => {
      const refreshToken = generateRefreshToken(mockUserId);
      expect(() => verifyAccessToken(refreshToken)).toThrow();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should return decoded payload for valid refresh token', () => {
      const token = generateRefreshToken(mockUserId);
      const payload = verifyRefreshToken(token);

      expect(payload.userId).toBe(mockUserId);
      expect(payload.type).toBe('refresh');
    });

    it('should throw error for expired refresh token', () => {
      const expiredToken = jwt.sign(
        { userId: mockUserId, type: 'refresh' },
        JWT_REFRESH_SECRET,
        { expiresIn: '0s' }
      );

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(() => verifyRefreshToken(expiredToken)).toThrow();
          resolve();
        }, 100);
      });
    });

    it('should throw error for invalid signature', () => {
      const token = jwt.sign(
        { userId: mockUserId, type: 'refresh' },
        'wrong-secret',
        { expiresIn: '7d' }
      );

      expect(() => verifyRefreshToken(token)).toThrow();
    });

    it('should throw error for access token passed to refresh verification', () => {
      const accessToken = generateAccessToken(mockUserId, mockEmail);
      expect(() => verifyRefreshToken(accessToken)).toThrow();
    });
  });

  describe('hashPassword', () => {
    it('should hash password with bcrypt', async () => {
      const hash = await hashPassword(mockPassword);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(mockPassword);
      expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 chars
    });

    it('should generate different hashes for same password', async () => {
      const hash1 = await hashPassword(mockPassword);
      const hash2 = await hashPassword(mockPassword);

      expect(hash1).not.toBe(hash2); // Due to random salt
    });

    it('should use bcrypt format (starts with $2b$)', async () => {
      const hash = await hashPassword(mockPassword);
      expect(hash).toMatch(/^\$2[aby]\$/);
    });
  });

  describe('comparePassword', () => {
    it('should return true for correct password', async () => {
      const hash = await hashPassword(mockPassword);
      const isMatch = await comparePassword(mockPassword, hash);

      expect(isMatch).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const hash = await hashPassword(mockPassword);
      const isMatch = await comparePassword('WrongPassword123!', hash);

      expect(isMatch).toBe(false);
    });

    it('should return false for empty password', async () => {
      const hash = await hashPassword(mockPassword);
      const isMatch = await comparePassword('', hash);

      expect(isMatch).toBe(false);
    });

    it('should be case sensitive', async () => {
      const hash = await hashPassword(mockPassword);
      const isMatch = await comparePassword(mockPassword.toLowerCase(), hash);

      expect(isMatch).toBe(false);
    });
  });

  describe('Integration: Full auth flow', () => {
    it('should complete full token generation and verification cycle', () => {
      // Generate tokens
      const accessToken = generateAccessToken(mockUserId, mockEmail);
      const refreshToken = generateRefreshToken(mockUserId);

      // Verify both tokens
      const accessPayload = verifyAccessToken(accessToken);
      const refreshPayload = verifyRefreshToken(refreshToken);

      expect(accessPayload.userId).toBe(mockUserId);
      expect(refreshPayload.userId).toBe(mockUserId);
    });

    it('should complete full password hash and compare cycle', async () => {
      // Hash password
      const hash = await hashPassword(mockPassword);

      // Verify correct password
      const correctMatch = await comparePassword(mockPassword, hash);
      expect(correctMatch).toBe(true);

      // Verify wrong password
      const wrongMatch = await comparePassword('WrongPass!', hash);
      expect(wrongMatch).toBe(false);
    });
  });
});
