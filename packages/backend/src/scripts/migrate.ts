import dotenv from 'dotenv';
import path from 'path';
import db from '../models/database';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function runMigrations() {
  try {
    logger.info('Starting database migrations...');
    await db.migrate();
    logger.info('Migrations completed successfully');
    await db.close();
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    await db.close();
    process.exit(1);
  }
}

runMigrations();
