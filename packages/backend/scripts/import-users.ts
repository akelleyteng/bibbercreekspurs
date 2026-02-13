import * as fs from 'fs';
import * as path from 'path';
import db from '../src/models/database';
import { hashPassword } from '../src/services/auth.service';
import { logger } from '../src/utils/logger';

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
}

function parseCSV(csvPath: string): UserData[] {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  // Skip header row
  const dataLines = lines.slice(1);

  const users: UserData[] = [];
  const seenEmails = new Set<string>();

  for (const line of dataLines) {
    // Split by comma, handling quoted fields
    const fields = line.split(',').map(f => f.trim().replace(/^"|"$/g, ''));

    const firstName = fields[0];
    const lastName = fields[2];
    const email = fields[17]; // E-mail 1 - Value

    // Skip if missing required fields
    if (!firstName || !lastName || !email || !email.includes('@')) {
      continue;
    }

    // Skip duplicates
    const emailLower = email.toLowerCase();
    if (seenEmails.has(emailLower)) {
      continue;
    }
    seenEmails.add(emailLower);

    users.push({
      firstName,
      lastName,
      email: emailLower
    });
  }

  return users;
}

async function importUsers() {
  try {
    const csvPath = process.argv[2];
    if (!csvPath) {
      console.error('Usage: npx ts-node scripts/import-users.ts <path-to-csv>');
      process.exit(1);
    }

    if (!fs.existsSync(csvPath)) {
      console.error(`File not found: ${csvPath}`);
      process.exit(1);
    }

    console.log(`Reading users from: ${csvPath}`);
    const users = parseCSV(csvPath);
    console.log(`Found ${users.length} unique users to import\n`);

    const password = 'bibbercreekspurspw1';
    const hashedPassword = await hashPassword(password);

    let imported = 0;
    let skipped = 0;

    for (const user of users) {
      try {
        // Check if user already exists
        const existing = await db.query(
          'SELECT id FROM users WHERE email = $1',
          [user.email]
        );

        if (existing.rows.length > 0) {
          console.log(`⏭️  Skipped: ${user.email} (already exists)`);
          skipped++;
          continue;
        }

        // Create user with MEMBER role
        await db.query(
          `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [user.email, hashedPassword, user.firstName, user.lastName, 'MEMBER', true]
        );

        console.log(`✅ Imported: ${user.firstName} ${user.lastName} (${user.email})`);
        imported++;

      } catch (error) {
        console.error(`❌ Failed to import ${user.email}:`, error);
      }
    }

    console.log(`\n===========================================`);
    console.log(`✅ Successfully imported: ${imported} users`);
    console.log(`⏭️  Skipped (already exist): ${skipped} users`);
    console.log(`===========================================`);
    console.log(`\nDefault password for all users: ${password}`);
    console.log(`\n⚠️  IMPORTANT: All users should change their password on first login!`);
    console.log(`   Consider adding a password reset feature to the admin dashboard.\n`);

    process.exit(0);
  } catch (error) {
    logger.error('Failed to import users:', error);
    process.exit(1);
  }
}

importUsers();
