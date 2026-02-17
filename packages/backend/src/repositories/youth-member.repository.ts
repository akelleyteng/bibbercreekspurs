import db from '../models/database';
import { logger } from '../utils/logger';

export interface YouthMember {
  id: string;
  parent_user_id: string;
  first_name: string;
  last_name: string;
  birthdate?: Date;
  project?: string;
  horse_names?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateYouthMemberData {
  parent_user_id: string;
  first_name: string;
  last_name: string;
  birthdate?: string;
  project?: string;
  horse_names?: string;
}

export interface UpdateYouthMemberData {
  first_name?: string;
  last_name?: string;
  birthdate?: string | null;
  project?: string | null;
  horse_names?: string | null;
}

export class YouthMemberRepository {
  async create(data: CreateYouthMemberData): Promise<YouthMember> {
    try {
      const result = await db.query<YouthMember>(
        `INSERT INTO youth_members (parent_user_id, first_name, last_name, birthdate, project, horse_names)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          data.parent_user_id,
          data.first_name,
          data.last_name,
          data.birthdate || null,
          data.project || null,
          data.horse_names || null,
        ]
      );

      logger.info(`Youth member created: ${data.first_name} ${data.last_name}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating youth member:', error);
      throw error;
    }
  }

  async findByParentId(parentUserId: string): Promise<YouthMember[]> {
    try {
      const result = await db.query<YouthMember>(
        `SELECT * FROM youth_members WHERE parent_user_id = $1 ORDER BY first_name`,
        [parentUserId]
      );
      return result.rows;
    } catch (error) {
      logger.error('Error finding youth members by parent:', error);
      throw error;
    }
  }

  async update(id: string, data: UpdateYouthMemberData): Promise<YouthMember | null> {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      const fields: (keyof UpdateYouthMemberData)[] = ['first_name', 'last_name', 'birthdate', 'project', 'horse_names'];
      for (const field of fields) {
        if (data[field] !== undefined) {
          updates.push(`${field} = $${paramIndex}`);
          values.push(data[field]);
          paramIndex++;
        }
      }

      if (updates.length === 0) return null;

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      const result = await db.query<YouthMember>(
        `UPDATE youth_members SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      if (result.rows.length === 0) return null;
      logger.info(`Youth member updated: ${result.rows[0].first_name} ${result.rows[0].last_name}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating youth member:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await db.query('DELETE FROM youth_members WHERE id = $1', [id]);
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      logger.error('Error deleting youth member:', error);
      throw error;
    }
  }

  async findAll(): Promise<YouthMember[]> {
    try {
      const result = await db.query<YouthMember>(
        `SELECT * FROM youth_members ORDER BY last_name, first_name`
      );
      return result.rows;
    } catch (error) {
      logger.error('Error finding all youth members:', error);
      throw error;
    }
  }
}
