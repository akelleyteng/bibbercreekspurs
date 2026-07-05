import db from '../models/database';
import { logger } from '../utils/logger';

export interface ImportantLinkRow {
  id: string;
  title: string;
  url: string;
  category: string | null;
  description: string | null;
  order_index: number | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateImportantLinkData {
  title: string;
  url: string;
  category?: string;
  description?: string;
  order_index?: number;
}

export interface UpdateImportantLinkData {
  title?: string;
  url?: string;
  category?: string;
  description?: string;
  order_index?: number;
  is_active?: boolean;
}

const COLUMNS = `id, title, url, category, description, order_index, is_active, created_at, updated_at`;

export class ImportantLinkRepository {
  async findAll(): Promise<ImportantLinkRow[]> {
    const result = await db.query<ImportantLinkRow>(
      `SELECT ${COLUMNS} FROM important_links
       ORDER BY order_index ASC NULLS LAST, category ASC NULLS LAST, created_at ASC`
    );
    return result.rows;
  }

  async findActive(): Promise<ImportantLinkRow[]> {
    const result = await db.query<ImportantLinkRow>(
      `SELECT ${COLUMNS} FROM important_links
       WHERE is_active = true
       ORDER BY order_index ASC NULLS LAST, category ASC NULLS LAST, created_at ASC`
    );
    return result.rows;
  }

  async findById(id: string): Promise<ImportantLinkRow | null> {
    const result = await db.query<ImportantLinkRow>(
      `SELECT ${COLUMNS} FROM important_links WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async create(data: CreateImportantLinkData): Promise<ImportantLinkRow> {
    const result = await db.query<ImportantLinkRow>(
      `INSERT INTO important_links (title, url, category, description, order_index)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${COLUMNS}`,
      [
        data.title,
        data.url,
        data.category || null,
        data.description || null,
        data.order_index ?? null,
      ]
    );
    logger.info(`Important link created: ${result.rows[0].id}`);
    return result.rows[0];
  }

  async update(id: string, data: UpdateImportantLinkData): Promise<ImportantLinkRow | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const fields: (keyof UpdateImportantLinkData)[] = [
      'title', 'url', 'category', 'description', 'order_index', 'is_active',
    ];

    for (const field of fields) {
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

    const result = await db.query<ImportantLinkRow>(
      `UPDATE important_links SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING ${COLUMNS}`,
      values
    );

    if (result.rows.length === 0) return null;
    logger.info(`Important link updated: ${id}`);
    return result.rows[0];
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.query('DELETE FROM important_links WHERE id = $1', [id]);
    const deleted = (result.rowCount ?? 0) > 0;
    if (deleted) logger.info(`Important link deleted: ${id}`);
    return deleted;
  }
}
