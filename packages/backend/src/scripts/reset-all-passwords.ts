// Load environment FIRST before any other imports
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env') });

// Now import everything else
import bcrypt from 'bcrypt';
import db from '../models/database';
import { logger } from '../utils/logger';

const NEW_PASSWORD = 'bibbercreek';

async function resetAllPasswords() {
  try {
    logger.info('Resetting all user passwords...');

    const passwordHash = await bcrypt.hash(NEW_PASSWORD, 10);

    const result = await db.query(
      `UPDATE users SET password_hash = $1, password_reset_required = true`,
      [passwordHash]
    );

    logger.info(`Updated ${result.rowCount} users — password set to "${NEW_PASSWORD}", password_reset_required = true`);

    await db.close();
    process.exit(0);
  } catch (error) {
    logger.error('Password reset failed:', error);
    await db.close();
    process.exit(1);
  }
}

resetAllPasswords();
