import db from '../src/models/database';
import { hashPassword } from '../src/services/auth.service';
import { logger } from '../src/utils/logger';

async function addAdminUser() {
  try {
    const email = 'akelleyteng@gmail.com';
    const password = 'sneakers27';
    const hashedPassword = await hashPassword(password);

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      logger.info(`User ${email} already exists`);
      process.exit(0);
    }

    // Create new admin user
    const result = await db.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, role`,
      [email, hashedPassword, 'Amanda', 'Kelley-Teng', 'ADMIN', true, true]
    );

    logger.info('Admin user created successfully:', result.rows[0]);
    console.log('\n✅ Admin user created!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Role: ADMIN');
    console.log('\n⚠️  Please change this password after first login!\n');

    process.exit(0);
  } catch (error) {
    logger.error('Failed to create admin user:', error);
    process.exit(1);
  }
}

addAdminUser();
