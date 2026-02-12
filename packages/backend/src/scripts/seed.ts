import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcrypt';
import db from '../models/database';
import { logger } from '../utils/logger';
import { Role } from '@4hclub/shared';

// Load environment variables from current working directory
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function seed() {
  try {
    logger.info('Starting database seeding...');

    // Create admin user
    const adminEmail = 'admin@bibbercreekspurs4h.org';
    const adminPassword = 'Admin123!'; // This should be changed immediately after first login
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // Check if admin already exists
    const existingAdmin = await db.query('SELECT id FROM users WHERE email = $1', [adminEmail]);

    if (existingAdmin.rows.length === 0) {
      const result = await db.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [adminEmail, passwordHash, 'Admin', 'User', Role.ADMIN, true]
      );

      const adminId = result.rows[0].id;
      logger.info(`Admin user created with ID: ${adminId}`);
      logger.info(`Admin credentials: ${adminEmail} / ${adminPassword}`);
      logger.warn('IMPORTANT: Change the admin password immediately after first login!');

      // Create sample home page content
      await db.query(
        `INSERT INTO home_page_content (section_type, title, content, is_active, updated_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          'MISSION',
          'Our Mission',
          'The Bibber Creek Spurs 4-H Club is dedicated to developing youth leaders, teaching life skills, and fostering community engagement through hands-on learning experiences.',
          true,
          adminId,
        ]
      );

      await db.query(
        `INSERT INTO home_page_content (section_type, title, content, is_active, updated_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          'ABOUT',
          'About Us',
          'We are a vibrant community of young people learning leadership, citizenship, and life skills through fun and engaging projects. From animal science to technology, our members explore their interests while making lifelong friends.',
          true,
          adminId,
        ]
      );

      logger.info('Sample home page content created');

      // Create a sample testimonial
      await db.query(
        `INSERT INTO testimonials (author_name, author_role, content, is_active, order_index)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          'Sarah Johnson',
          'Parent',
          '4-H has been an amazing experience for my daughter. She has gained confidence, made wonderful friends, and developed skills that will serve her throughout her life.',
          true,
          1,
        ]
      );

      logger.info('Sample testimonial created');

      logger.info('Database seeding completed successfully');
    } else {
      logger.info('Admin user already exists, skipping seeding');
    }

    await db.close();
    process.exit(0);
  } catch (error) {
    logger.error('Seeding failed:', error);
    await db.close();
    process.exit(1);
  }
}

seed();
