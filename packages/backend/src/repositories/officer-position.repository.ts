import db from '../models/database';
import { logger } from '../utils/logger';

export interface OfficerPositionRow {
  id: string;
  position: string;
  term_year: string;
  holder_user_id: string | null;
  holder_youth_member_id: string | null;
  // Joined user fields
  user_first_name?: string;
  user_last_name?: string;
  user_email?: string;
  user_profile_photo_url?: string;
  // Joined youth member fields
  youth_first_name?: string;
  youth_last_name?: string;
  created_at: Date;
  updated_at: Date;
}

export class OfficerPositionRepository {
  async findByYear(termYear: string): Promise<OfficerPositionRow[]> {
    try {
      const result = await db.query<OfficerPositionRow>(
        `SELECT op.*,
                u.first_name AS user_first_name,
                u.last_name AS user_last_name,
                u.email AS user_email,
                u.profile_photo_url AS user_profile_photo_url,
                ym.first_name AS youth_first_name,
                ym.last_name AS youth_last_name
         FROM officer_positions op
         LEFT JOIN users u ON op.holder_user_id = u.id
         LEFT JOIN youth_members ym ON op.holder_youth_member_id = ym.id
         WHERE op.term_year = $1
         ORDER BY op.position`,
        [termYear]
      );
      return result.rows;
    } catch (error) {
      logger.error('Error finding officer positions by year:', error);
      throw error;
    }
  }

  async upsert(position: string, termYear: string, holderUserId: string | null, holderYouthMemberId: string | null): Promise<OfficerPositionRow> {
    try {
      const result = await db.query<OfficerPositionRow>(
        `INSERT INTO officer_positions (position, term_year, holder_user_id, holder_youth_member_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (position, term_year)
         DO UPDATE SET holder_user_id = $3, holder_youth_member_id = $4, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [position, termYear, holderUserId, holderYouthMemberId]
      );
      logger.info(`Officer position set: ${position} for ${termYear}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error upserting officer position:', error);
      throw error;
    }
  }

  async remove(position: string, termYear: string): Promise<boolean> {
    try {
      const result = await db.query(
        'DELETE FROM officer_positions WHERE position = $1 AND term_year = $2',
        [position, termYear]
      );
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      logger.error('Error removing officer position:', error);
      throw error;
    }
  }

  async getTermYears(): Promise<string[]> {
    try {
      const result = await db.query<{ term_year: string }>(
        'SELECT DISTINCT term_year FROM officer_positions ORDER BY term_year DESC'
      );
      return result.rows.map(r => r.term_year);
    } catch (error) {
      logger.error('Error getting term years:', error);
      throw error;
    }
  }
}
