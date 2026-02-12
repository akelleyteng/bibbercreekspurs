export const CONSTANTS = {
  // Password hashing
  BCRYPT_SALT_ROUNDS: 10,

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,

  // File uploads
  MAX_FILE_SIZE_MB: 10,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],

  // Email
  PASSWORD_RESET_TOKEN_EXPIRY_MINUTES: 10,

  // Session
  SESSION_COOKIE_NAME: '4hclub_refresh_token',
  SESSION_COOKIE_MAX_AGE: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
};

export default CONSTANTS;
