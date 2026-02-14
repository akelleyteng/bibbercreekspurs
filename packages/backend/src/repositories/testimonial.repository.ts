import db from '../models/database';
import { logger } from '../utils/logger';

export interface TestimonialRow {
  id: string;
  author_name: string;
  author_role?: string;
  content: string;
  image_url?: string;
  order_index?: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTestimonialData {
  author_name: string;
  author_role?: string;
  content: string;
  image_url?: string;
  order_index?: number;
}

export interface UpdateTestimonialData {
  author_name?: string;
  author_role?: string;
  content?: string;
  image_url?: string;
  order_index?: number;
  is_active?: boolean;
}

export class TestimonialRepository {
  async findAll(): Promise<TestimonialRow[]> {
    const result = await db.query<TestimonialRow>(
      `SELECT id, author_name, author_role, content, image_url, order_index, is_active, created_at, updated_at
       FROM testimonials
       ORDER BY order_index ASC NULLS LAST, created_at DESC`
    );
    return result.rows;
  }

  async findActive(): Promise<TestimonialRow[]> {
    const result = await db.query<TestimonialRow>(
      `SELECT id, author_name, author_role, content, image_url, order_index, is_active, created_at, updated_at
       FROM testimonials
       WHERE is_active = true
       ORDER BY order_index ASC NULLS LAST, created_at DESC`
    );
    return result.rows;
  }

  async findById(id: string): Promise<TestimonialRow | null> {
    const result = await db.query<TestimonialRow>(
      `SELECT id, author_name, author_role, content, image_url, order_index, is_active, created_at, updated_at
       FROM testimonials
       WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async create(data: CreateTestimonialData): Promise<TestimonialRow> {
    const result = await db.query<TestimonialRow>(
      `INSERT INTO testimonials (author_name, author_role, content, image_url, order_index)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, author_name, author_role, content, image_url, order_index, is_active, created_at, updated_at`,
      [
        data.author_name,
        data.author_role || null,
        data.content,
        data.image_url || null,
        data.order_index ?? null,
      ]
    );
    logger.info(`Testimonial created: ${result.rows[0].id}`);
    return result.rows[0];
  }

  async update(id: string, data: UpdateTestimonialData): Promise<TestimonialRow | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const fields: (keyof UpdateTestimonialData)[] = [
      'author_name', 'author_role', 'content', 'image_url', 'order_index', 'is_active',
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

    const result = await db.query<TestimonialRow>(
      `UPDATE testimonials
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, author_name, author_role, content, image_url, order_index, is_active, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    logger.info(`Testimonial updated: ${id}`);
    return result.rows[0];
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.query('DELETE FROM testimonials WHERE id = $1', [id]);
    const deleted = (result.rowCount ?? 0) > 0;
    if (deleted) {
      logger.info(`Testimonial deleted: ${id}`);
    }
    return deleted;
  }
}
