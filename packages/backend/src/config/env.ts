import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface EnvConfig {
  // Server
  NODE_ENV: string;
  PORT: number;

  // Database
  DATABASE_URL: string;

  // Redis
  REDIS_URL: string;

  // JWT
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRY: string;
  JWT_REFRESH_EXPIRY: string;

  // Google Cloud Platform
  GCP_PROJECT_ID: string;
  GCP_STORAGE_BUCKET: string;
  GOOGLE_APPLICATION_CREDENTIALS?: string;

  // Gmail API
  GMAIL_USER: string;
  GMAIL_CLIENT_ID: string;
  GMAIL_CLIENT_SECRET: string;
  GMAIL_REFRESH_TOKEN: string;

  // Google APIs (Drive, Calendar)
  GOOGLE_OAUTH_CLIENT_ID: string;
  GOOGLE_OAUTH_CLIENT_SECRET: string;
  GOOGLE_DRIVE_FOLDER_ID: string;

  // Facebook
  FACEBOOK_APP_ID: string;
  FACEBOOK_APP_SECRET: string;
  FACEBOOK_PAGE_ID: string;
  FACEBOOK_PAGE_ACCESS_TOKEN: string;

  // Frontend
  FRONTEND_URL: string;

  // GraphQL
  GRAPHQL_ENDPOINT: string;
  GRAPHQL_PLAYGROUND: boolean;

  // Logging
  LOG_LEVEL: string;
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value!;
}

export const env: EnvConfig = {
  // Server
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  PORT: parseInt(getEnvVar('PORT', '4000'), 10),

  // Database
  DATABASE_URL: getEnvVar('DATABASE_URL'),

  // Redis
  REDIS_URL: getEnvVar('REDIS_URL'),

  // JWT
  JWT_ACCESS_SECRET: getEnvVar('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: getEnvVar('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRY: getEnvVar('JWT_ACCESS_EXPIRY', '15m'),
  JWT_REFRESH_EXPIRY: getEnvVar('JWT_REFRESH_EXPIRY', '7d'),

  // Google Cloud Platform
  GCP_PROJECT_ID: getEnvVar('GCP_PROJECT_ID'),
  GCP_STORAGE_BUCKET: getEnvVar('GCP_STORAGE_BUCKET'),
  GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,

  // Gmail API
  GMAIL_USER: getEnvVar('GMAIL_USER'),
  GMAIL_CLIENT_ID: getEnvVar('GMAIL_CLIENT_ID'),
  GMAIL_CLIENT_SECRET: getEnvVar('GMAIL_CLIENT_SECRET'),
  GMAIL_REFRESH_TOKEN: getEnvVar('GMAIL_REFRESH_TOKEN'),

  // Google APIs (Drive, Calendar)
  GOOGLE_OAUTH_CLIENT_ID: getEnvVar('GOOGLE_OAUTH_CLIENT_ID'),
  GOOGLE_OAUTH_CLIENT_SECRET: getEnvVar('GOOGLE_OAUTH_CLIENT_SECRET'),
  GOOGLE_DRIVE_FOLDER_ID: getEnvVar('GOOGLE_DRIVE_FOLDER_ID'),

  // Facebook
  FACEBOOK_APP_ID: getEnvVar('FACEBOOK_APP_ID'),
  FACEBOOK_APP_SECRET: getEnvVar('FACEBOOK_APP_SECRET'),
  FACEBOOK_PAGE_ID: getEnvVar('FACEBOOK_PAGE_ID'),
  FACEBOOK_PAGE_ACCESS_TOKEN: getEnvVar('FACEBOOK_PAGE_ACCESS_TOKEN'),

  // Frontend
  FRONTEND_URL: getEnvVar('FRONTEND_URL'),

  // GraphQL
  GRAPHQL_ENDPOINT: getEnvVar('GRAPHQL_ENDPOINT', '/graphql'),
  GRAPHQL_PLAYGROUND: getEnvVar('GRAPHQL_PLAYGROUND', 'true') === 'true',

  // Logging
  LOG_LEVEL: getEnvVar('LOG_LEVEL', 'info'),
};

export default env;
