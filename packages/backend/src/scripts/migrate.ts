// Load environment FIRST before any other imports
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env') });

// Now import everything else
import db from '../models/database';
import { logger } from '../utils/logger';

async function runMigrations() {
  try {
    logger.info('Starting database migrations...');
    logger.info(`Database URL: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@')}`); // Log masked URL
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
