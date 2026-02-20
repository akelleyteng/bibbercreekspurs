import db from '../models/database';
import { logger } from '../utils/logger';

export interface FamilyLink {
  id: string;
  parent_user_id: string;
  child_user_id: string;
  created_at: Date;
}

export interface LinkedUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  profile_photo_url?: string;
}

export class FamilyLinkRepository {
  async create(parentUserId: string, childUserId: string): Promise<FamilyLink> {
    try {
      const result = await db.query<FamilyLink>(
        `INSERT INTO family_links (parent_user_id, child_user_id)
         VALUES ($1, $2)
         ON CONFLICT (parent_user_id, child_user_id) DO NOTHING
         RETURNING id, parent_user_id, child_user_id, created_at`,
        [parentUserId, childUserId]
      );
      if (result.rows.length === 0) {
        // Link already exists, fetch it
        const existing = await db.query<FamilyLink>(
          `SELECT id, parent_user_id, child_user_id, created_at
           FROM family_links WHERE parent_user_id = $1 AND child_user_id = $2`,
          [parentUserId, childUserId]
        );
        return existing.rows[0];
      }
      logger.info(`Family link created: parent=${parentUserId} child=${childUserId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating family link:', error);
      throw error;
    }
  }

  async findByParentId(parentUserId: string): Promise<LinkedUser[]> {
    try {
      const result = await db.query<LinkedUser>(
        `SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.profile_photo_url
         FROM family_links fl
         JOIN users u ON u.id = fl.child_user_id
         WHERE fl.parent_user_id = $1
         ORDER BY u.first_name, u.last_name`,
        [parentUserId]
      );
      return result.rows;
    } catch (error) {
      logger.error('Error finding children by parent:', error);
      throw error;
    }
  }

  async findByChildId(childUserId: string): Promise<LinkedUser[]> {
    try {
      const result = await db.query<LinkedUser>(
        `SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.profile_photo_url
         FROM family_links fl
         JOIN users u ON u.id = fl.parent_user_id
         WHERE fl.child_user_id = $1
         ORDER BY u.first_name, u.last_name`,
        [childUserId]
      );
      return result.rows;
    } catch (error) {
      logger.error('Error finding parents by child:', error);
      throw error;
    }
  }

  async findAllGrouped(): Promise<Map<string, { parents: LinkedUser[]; children: LinkedUser[] }>> {
    try {
      const result = await db.query<FamilyLink & { parent_first_name: string; parent_last_name: string; parent_email: string; parent_role: string; parent_profile_photo_url: string; child_first_name: string; child_last_name: string; child_email: string; child_role: string; child_profile_photo_url: string }>(
        `SELECT fl.*,
          p.first_name AS parent_first_name, p.last_name AS parent_last_name, p.email AS parent_email, p.role AS parent_role, p.profile_photo_url AS parent_profile_photo_url,
          c.first_name AS child_first_name, c.last_name AS child_last_name, c.email AS child_email, c.role AS child_role, c.profile_photo_url AS child_profile_photo_url
         FROM family_links fl
         JOIN users p ON p.id = fl.parent_user_id
         JOIN users c ON c.id = fl.child_user_id`
      );

      const map = new Map<string, { parents: LinkedUser[]; children: LinkedUser[] }>();

      for (const row of result.rows) {
        // Add child to parent's children list
        if (!map.has(row.parent_user_id)) {
          map.set(row.parent_user_id, { parents: [], children: [] });
        }
        map.get(row.parent_user_id)!.children.push({
          id: row.child_user_id,
          first_name: row.child_first_name,
          last_name: row.child_last_name,
          email: row.child_email,
          role: row.child_role,
          profile_photo_url: row.child_profile_photo_url,
        });

        // Add parent to child's parents list
        if (!map.has(row.child_user_id)) {
          map.set(row.child_user_id, { parents: [], children: [] });
        }
        map.get(row.child_user_id)!.parents.push({
          id: row.parent_user_id,
          first_name: row.parent_first_name,
          last_name: row.parent_last_name,
          email: row.parent_email,
          role: row.parent_role,
          profile_photo_url: row.parent_profile_photo_url,
        });
      }

      return map;
    } catch (error) {
      logger.error('Error fetching all family links:', error);
      return new Map();
    }
  }

  async delete(parentUserId: string, childUserId: string): Promise<boolean> {
    try {
      const result = await db.query(
        `DELETE FROM family_links WHERE parent_user_id = $1 AND child_user_id = $2`,
        [parentUserId, childUserId]
      );
      const deleted = (result.rowCount ?? 0) > 0;
      if (deleted) {
        logger.info(`Family link removed: parent=${parentUserId} child=${childUserId}`);
      }
      return deleted;
    } catch (error) {
      logger.error('Error deleting family link:', error);
      throw error;
    }
  }
}
