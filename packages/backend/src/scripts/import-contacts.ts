// Load environment FIRST before any other imports
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env') });

// Now import everything else
import fs from 'fs';
import bcrypt from 'bcrypt';
import { parse } from 'csv-parse/sync';
import db from '../models/database';
import { logger } from '../utils/logger';
import { Role } from '@4hclub/shared';

const TEMP_PASSWORD = 'Welcome2025!';

interface CsvRow {
  'First Name': string;
  'Last Name': string;
  'E-mail 1 - Value': string;
  'Phone 1 - Value': string;
  // Custom fields are positional — we extract them by label/value pairs
  [key: string]: string;
}

interface MergedContact {
  firstName: string;
  lastName: string;
  emails: string[];
  phone?: string;
  youthFirstName?: string;
  youthLastName?: string;
  youthBirthdate?: string;
  project?: string;
  horseNames?: string;
}

function getCustomFieldValue(row: CsvRow, label: string): string {
  for (let i = 1; i <= 10; i++) {
    if (row[`Custom Field ${i} - Label`] === label) {
      return row[`Custom Field ${i} - Value`] || '';
    }
  }
  return '';
}

function cleanPhone(phone: string): string {
  if (!phone) return '';
  // Strip leading '+1 ', quotes, dashes, spaces
  return phone.replace(/^'?\+?1?\s*/, '').replace(/[^0-9]/g, '');
}

async function importContacts() {
  try {
    logger.info('Starting contact import...');

    const csvPath = path.join(__dirname, '../../data/contacts.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8')
      // Strip BOM
      .replace(/^\uFEFF/, '');

    const rows: CsvRow[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
    });

    logger.info(`Parsed ${rows.length} rows from CSV`);

    // Deduplicate by first+last name, merging data
    const contactMap = new Map<string, MergedContact>();

    for (const row of rows) {
      const firstName = (row['First Name'] || '').trim();
      const lastName = (row['Last Name'] || '').trim();
      const email = (row['E-mail 1 - Value'] || '').trim().toLowerCase();
      const phone = cleanPhone(row['Phone 1 - Value'] || '');

      if (!firstName || !email) {
        logger.warn(`Skipping row with missing name or email: ${firstName} ${lastName} <${email}>`);
        continue;
      }

      const key = `${firstName.toLowerCase()}|${lastName.toLowerCase()}`;
      const existing = contactMap.get(key);

      const youthFirstName = getCustomFieldValue(row, 'Youth member first name');
      const youthLastName = getCustomFieldValue(row, 'Youth member last name');
      const youthBirthdate = getCustomFieldValue(row, 'Youth birthdate');
      const project = getCustomFieldValue(row, 'Project');
      const horseNames = getCustomFieldValue(row, 'Horse Name(s)');

      if (existing) {
        // Merge: add email if new, keep phone if missing, keep youth data if missing
        if (!existing.emails.includes(email)) {
          existing.emails.push(email);
          logger.info(`  Merged duplicate "${firstName} ${lastName}" — additional email: ${email}`);
        }
        if (!existing.phone && phone) {
          existing.phone = phone;
        }
        if (!existing.youthFirstName && youthFirstName) {
          existing.youthFirstName = youthFirstName;
          existing.youthLastName = youthLastName;
          existing.youthBirthdate = youthBirthdate;
          existing.project = project;
          existing.horseNames = horseNames;
        }
      } else {
        contactMap.set(key, {
          firstName,
          lastName,
          emails: [email],
          phone: phone || undefined,
          youthFirstName: youthFirstName || undefined,
          youthLastName: youthLastName || undefined,
          youthBirthdate: youthBirthdate || undefined,
          project: project || undefined,
          horseNames: horseNames || undefined,
        });
      }
    }

    logger.info(`Deduplicated to ${contactMap.size} unique contacts`);

    const passwordHash = await bcrypt.hash(TEMP_PASSWORD, 10);

    let usersCreated = 0;
    let usersSkipped = 0;
    let youthCreated = 0;

    for (const contact of contactMap.values()) {
      const primaryEmail = contact.emails[0];

      // Check if user already exists
      const existing = await db.query('SELECT id FROM users WHERE email = $1', [primaryEmail]);
      let userId: string;

      if (existing.rows.length > 0) {
        userId = existing.rows[0].id;
        logger.info(`  User exists: ${contact.firstName} ${contact.lastName} <${primaryEmail}>`);
        usersSkipped++;
      } else {
        // Create user account
        const userResult = await db.query(
          `INSERT INTO users (email, password_hash, first_name, last_name, role, phone, password_reset_required)
           VALUES ($1, $2, $3, $4, $5, $6, true)
           RETURNING id`,
          [primaryEmail, passwordHash, contact.firstName, contact.lastName, Role.PARENT, contact.phone || null]
        );
        userId = userResult.rows[0].id;
        usersCreated++;
        logger.info(`  Created user: ${contact.firstName} ${contact.lastName} <${primaryEmail}>`);

        if (contact.emails.length > 1) {
          logger.info(`    Additional emails (not stored): ${contact.emails.slice(1).join(', ')}`);
        }
      }

      // Create youth member if data present (even for existing users)
      if (contact.youthFirstName) {
        // Check if youth member already exists for this parent
        const existingYouth = await db.query(
          'SELECT id FROM youth_members WHERE parent_user_id = $1 AND first_name = $2 AND last_name = $3',
          [userId, contact.youthFirstName, contact.youthLastName || contact.lastName]
        );
        if (existingYouth.rows.length > 0) {
          logger.info(`    Youth member already exists: ${contact.youthFirstName} ${contact.youthLastName || contact.lastName}`);
        } else {
          await db.query(
            `INSERT INTO youth_members (parent_user_id, first_name, last_name, birthdate, project, horse_names)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              userId,
              contact.youthFirstName,
              contact.youthLastName || contact.lastName,
              contact.youthBirthdate || null,
              contact.project || null,
              contact.horseNames || null,
            ]
          );
          youthCreated++;
          logger.info(`    Created youth member: ${contact.youthFirstName} ${contact.youthLastName || contact.lastName}`);
        }
      }
    }

    logger.info('');
    logger.info('=== Import Summary ===');
    logger.info(`Users created:  ${usersCreated}`);
    logger.info(`Users skipped:  ${usersSkipped} (email already exists)`);
    logger.info(`Youth members:  ${youthCreated}`);
    logger.info(`Temp password:  ${TEMP_PASSWORD}`);
    logger.info('All imported users have password_reset_required=true');

    await db.close();
    process.exit(0);
  } catch (error) {
    logger.error('Import failed:', error);
    await db.close();
    process.exit(1);
  }
}

importContacts();
