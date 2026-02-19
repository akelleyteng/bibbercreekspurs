import db from '../models/database';
import { Role } from '@4hclub/shared';
import { logger } from '../utils/logger';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  phone?: string;
  address?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  profile_photo_url?: string;
  password_reset_required?: boolean;
  last_login?: Date;
  last_login_device?: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserActivityCounts {
  post_count: number;
  comment_count: number;
  blog_post_count: number;
}

export interface UserWithPassword extends User {
  password_hash: string;
}

export interface CreateUserData {
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: Role;
  phone?: string;
  address?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  password_reset_required?: boolean;
}

export interface UpdateUserData {
  first_name?: string;
  last_name?: string;
  phone?: string;
  address?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  profile_photo_url?: string;
}

export interface AdminUpdateUserData extends UpdateUserData {
  email?: string;
  role?: Role;
}

export class UserRepository {
  /**
   * Create a new user
   * @param data User creation data
   * @returns Created user (without password_hash)
   * @throws Error if email already exists
   */
  async create(data: CreateUserData): Promise<User> {
    try {
      const result = await db.query<UserWithPassword>(
        `INSERT INTO users (
          email, password_hash, first_name, last_name, role,
          phone, address, emergency_contact, emergency_phone, password_reset_required
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, email, first_name, last_name, role, phone, address,
                  emergency_contact, emergency_phone, profile_photo_url,
                  password_reset_required, last_login, last_login_device, created_at, updated_at`,
        [
          data.email,
          data.password_hash,
          data.first_name,
          data.last_name,
          data.role,
          data.phone || null,
          data.address || null,
          data.emergency_contact || null,
          data.emergency_phone || null,
          data.password_reset_required ?? false,
        ]
      );

      const user = result.rows[0];
      logger.info(`User created: ${user.email}`);

      // Remove password_hash before returning
      const { password_hash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error: any) {
      // Handle unique constraint violation (duplicate email)
      if (error.code === '23505' && error.constraint === 'users_email_key') {
        logger.warn(`Attempted to create user with existing email: ${data.email}`);
        throw new Error('Email already exists');
      }
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Find user by email (includes password_hash for authentication)
   * @param email User email
   * @returns User with password_hash or null if not found
   */
  async findByEmail(email: string): Promise<UserWithPassword | null> {
    try {
      const result = await db.query<UserWithPassword>(
        `SELECT id, email, password_hash, first_name, last_name, role,
                phone, address, emergency_contact, emergency_phone,
                profile_photo_url, password_reset_required,
                last_login, last_login_device, created_at, updated_at
         FROM users
         WHERE email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Find user by ID (excludes password_hash)
   * @param id User ID
   * @returns User or null if not found
   */
  async findById(id: string): Promise<User | null> {
    try {
      const result = await db.query<User>(
        `SELECT id, email, first_name, last_name, role,
                phone, address, emergency_contact, emergency_phone,
                profile_photo_url, password_reset_required,
                last_login, last_login_device, created_at, updated_at
         FROM users
         WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw error;
    }
  }

  /**
   * Update user data
   * @param id User ID
   * @param data Fields to update
   * @returns Updated user or null if not found
   */
  async update(id: string, data: UpdateUserData): Promise<User | null> {
    try {
      // Build dynamic SET clause based on provided fields
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Allowed fields for update
      const allowedFields: (keyof UpdateUserData)[] = [
        'first_name',
        'last_name',
        'phone',
        'address',
        'emergency_contact',
        'emergency_phone',
        'profile_photo_url',
      ];

      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          updates.push(`${field} = $${paramIndex}`);
          values.push(data[field]);
          paramIndex++;
        }
      }

      if (updates.length === 0) {
        // No fields to update
        return this.findById(id);
      }

      // Always update the updated_at timestamp
      updates.push('updated_at = CURRENT_TIMESTAMP');

      values.push(id); // Last parameter is the user ID

      const result = await db.query<User>(
        `UPDATE users
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING id, email, first_name, last_name, role,
                   phone, address, emergency_contact, emergency_phone,
                   profile_photo_url, password_reset_required,
                   last_login, last_login_device, created_at, updated_at`,
        values
      );

      if (result.rows.length === 0) {
        return null;
      }

      logger.info(`User updated: ${result.rows[0].email}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Admin update - allows changing role and email in addition to standard fields
   */
  async adminUpdate(id: string, data: AdminUpdateUserData): Promise<User | null> {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      const allowedFields: (keyof AdminUpdateUserData)[] = [
        'first_name', 'last_name', 'email', 'role',
        'phone', 'address', 'emergency_contact', 'emergency_phone', 'profile_photo_url',
      ];

      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          updates.push(`${field} = $${paramIndex}`);
          values.push(data[field]);
          paramIndex++;
        }
      }

      if (updates.length === 0) {
        return this.findById(id);
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      const result = await db.query<User>(
        `UPDATE users
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING id, email, first_name, last_name, role,
                   phone, address, emergency_contact, emergency_phone,
                   profile_photo_url, password_reset_required,
                   last_login, last_login_device, created_at, updated_at`,
        values
      );

      if (result.rows.length === 0) {
        return null;
      }

      logger.info(`User admin-updated: ${result.rows[0].email}`);
      return result.rows[0];
    } catch (error: any) {
      if (error.code === '23505' && error.constraint === 'users_email_key') {
        throw new Error('Email already exists');
      }
      logger.error('Error admin-updating user:', error);
      throw error;
    }
  }

  /**
   * Delete user by ID
   * @param id User ID
   * @returns True if deleted, false if not found
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await db.query('DELETE FROM users WHERE id = $1', [id]);

      const deleted = (result.rowCount ?? 0) > 0;
      if (deleted) {
        logger.info(`User deleted: ${id}`);
      }

      return deleted;
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Find all users (excludes password_hash)
   * @returns Array of users
   */
  async findAll(): Promise<User[]> {
    try {
      const result = await db.query<User>(
        `SELECT id, email, first_name, last_name, role,
                phone, address, emergency_contact, emergency_phone,
                profile_photo_url, password_reset_required,
                last_login, last_login_device, created_at, updated_at
         FROM users
         ORDER BY created_at DESC`
      );

      return result.rows;
    } catch (error) {
      logger.error('Error finding all users:', error);
      throw error;
    }
  }

  /**
   * Update user password
   * @param id User ID
   * @param passwordHash New hashed password
   * @param forceResetOnLogin If true, user must change password on next login
   * @returns True if updated, false if user not found
   */
  async updateLastLogin(id: string, device: string | null): Promise<void> {
    try {
      await db.query(
        `UPDATE users SET last_login = NOW(), last_login_device = $1 WHERE id = $2`,
        [device, id]
      );
    } catch (error) {
      logger.error('Error updating last login:', error);
    }
  }

  async getAllActivityCounts(): Promise<Map<string, UserActivityCounts>> {
    try {
      const result = await db.query<{ user_id: string } & UserActivityCounts>(
        `SELECT
          u.id AS user_id,
          COALESCE((SELECT COUNT(*)::int FROM posts p WHERE p.author_id = u.id AND p.deleted_at IS NULL AND p.is_hidden = false), 0) AS post_count,
          COALESCE((SELECT COUNT(*)::int FROM comments c WHERE c.author_id = u.id), 0) AS comment_count,
          COALESCE((SELECT COUNT(*)::int FROM blog_posts b WHERE b.author_id = u.id AND b.deleted_at IS NULL), 0) AS blog_post_count
         FROM users u`
      );
      const map = new Map<string, UserActivityCounts>();
      for (const row of result.rows) {
        map.set(row.user_id, {
          post_count: row.post_count,
          comment_count: row.comment_count,
          blog_post_count: row.blog_post_count,
        });
      }
      return map;
    } catch (error) {
      logger.error('Error fetching activity counts:', error);
      return new Map();
    }
  }

  async updatePassword(id: string, passwordHash: string, forceResetOnLogin: boolean = false): Promise<boolean> {
    try {
      const result = await db.query(
        `UPDATE users
         SET password_hash = $1,
             password_reset_required = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [passwordHash, forceResetOnLogin, id]
      );

      const updated = (result.rowCount ?? 0) > 0;
      if (updated) {
        logger.info(`Password updated for user ID: ${id}`);
      }

      return updated;
    } catch (error) {
      logger.error('Error updating password:', error);
      throw error;
    }
  }
}
