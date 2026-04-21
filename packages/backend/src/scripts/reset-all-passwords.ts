// Load environment FIRST before any other imports
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env') });

// Now import everything else
import bcrypt from 'bcrypt';
import db from '../models/database';
import { logger } from '../utils/logger';

const NEW_PASSWORD = 'bibbercreek';

async function resetPasswordsForNewUsers() {
  try {
    logger.info('Resetting passwords for users who have never logged in...');

    const passwordHash = await bcrypt.hash(NEW_PASSWORD, 10);

    const result = await db.query<{ email: string }>(
      `UPDATE users
       SET password_hash = $1, password_reset_required = true
       WHERE last_login IS NULL
       RETURNING email`,
      [passwordHash]
    );

    const affected = result.rows.map((r) => r.email);
    logger.info(`Updated ${affected.length} users — password set to "${NEW_PASSWORD}", password_reset_required = true`);
    if (affected.length > 0) {
      logger.info('Affected accounts:\n' + affected.join('\n'));
    }

    await db.close();
    process.exit(0);
  } catch (error) {
    logger.error('Password reset failed:', error);
    await db.close();
    process.exit(1);
  }
}

resetPasswordsForNewUsers();
