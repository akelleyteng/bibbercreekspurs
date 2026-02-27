import db from '../models/database';
import { logger } from '../utils/logger';

export interface BlogGuidelinesRow {
  id: string;
  content: string;
  updated_by?: string;
  updated_at: Date;
}

export class BlogGuidelinesRepository {
  async findCurrent(): Promise<BlogGuidelinesRow | null> {
    const result = await db.query<BlogGuidelinesRow>(
      `SELECT id, content, updated_by, updated_at FROM blog_guidelines ORDER BY updated_at DESC LIMIT 1`
    );
    return result.rows[0] || null;
  }

  async upsert(content: string, updatedBy: string): Promise<BlogGuidelinesRow> {
    const existing = await this.findCurrent();

    if (existing) {
      const result = await db.query<BlogGuidelinesRow>(
        `UPDATE blog_guidelines
         SET content = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING id, content, updated_by, updated_at`,
        [content, updatedBy, existing.id]
      );
      logger.info(`Blog guidelines updated by user: ${updatedBy}`);
      return result.rows[0];
    }

    const result = await db.query<BlogGuidelinesRow>(
      `INSERT INTO blog_guidelines (content, updated_by)
       VALUES ($1, $2)
       RETURNING id, content, updated_by, updated_at`,
      [content, updatedBy]
    );
    logger.info(`Blog guidelines created by user: ${updatedBy}`);
    return result.rows[0];
  }
}
