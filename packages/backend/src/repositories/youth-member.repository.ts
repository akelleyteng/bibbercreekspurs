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
