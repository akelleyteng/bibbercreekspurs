import db from '../models/database';
import { logger } from '../utils/logger';

export interface SponsorRow {
  id: string;
  name: string;
  logo_url: string;
  website_url?: string;
  description?: string;
  order_index?: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSponsorData {
  name: string;
  logo_url: string;
  website_url?: string;
  description?: string;
  order_index?: number;
}

export interface UpdateSponsorData {
  name?: string;
  logo_url?: string;
  website_url?: string;
  description?: string;
  order_index?: number;
  is_active?: boolean;
}

export class SponsorRepository {
  async findAll(): Promise<SponsorRow[]> {
    const result = await db.query<SponsorRow>(
      `SELECT id, name, logo_url, website_url, description, order_index, is_active, created_at, updated_at
       FROM sponsors
       ORDER BY order_index ASC NULLS LAST, created_at DESC`
    );
    return result.rows;
  }

  async findActive(): Promise<SponsorRow[]> {
    const result = await db.query<SponsorRow>(
      `SELECT id, name, logo_url, website_url, description, order_index, is_active, created_at, updated_at
       FROM sponsors
       WHERE is_active = true
       ORDER BY order_index ASC NULLS LAST, created_at DESC`
    );
    return result.rows;
  }

  async findById(id: string): Promise<SponsorRow | null> {
    const result = await db.query<SponsorRow>(
      `SELECT id, name, logo_url, website_url, description, order_index, is_active, created_at, updated_at
       FROM sponsors
       WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async create(data: CreateSponsorData): Promise<SponsorRow> {
    const result = await db.query<SponsorRow>(
      `INSERT INTO sponsors (name, logo_url, website_url, description, order_index)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, logo_url, website_url, description, order_index, is_active, created_at, updated_at`,
      [
        data.name,
        data.logo_url,
        data.website_url || null,
        data.description || null,
        data.order_index ?? null,
      ]
    );
    logger.info(`Sponsor created: ${result.rows[0].id}`);
    return result.rows[0];
  }

  async update(id: string, data: UpdateSponsorData): Promise<SponsorRow | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const fields: (keyof UpdateSponsorData)[] = [
      'name', 'logo_url', 'website_url', 'description', 'order_index', 'is_active',
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

    const result = await db.query<SponsorRow>(
      `UPDATE sponsors
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, name, logo_url, website_url, description, order_index, is_active, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    logger.info(`Sponsor updated: ${id}`);
    return result.rows[0];
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.query('DELETE FROM sponsors WHERE id = $1', [id]);
    const deleted = (result.rowCount ?? 0) > 0;
    if (deleted) {
      logger.info(`Sponsor deleted: ${id}`);
    }
    return deleted;
  }
}
