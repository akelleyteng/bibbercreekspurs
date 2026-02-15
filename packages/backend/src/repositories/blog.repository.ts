import db from '../models/database';
import { logger } from '../utils/logger';

export interface BlogPostRow {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  author_id: string;
  visibility: string;
  featured_image_url?: string;
  published_at?: Date;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
  // Joined fields
  author_first_name: string;
  author_last_name: string;
  author_profile_image_url?: string;
}

export interface CreateBlogPostData {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  author_id: string;
  visibility: string;
  featured_image_url?: string;
  published_at?: Date;
}

export interface UpdateBlogPostData {
  title?: string;
  slug?: string;
  content?: string;
  excerpt?: string;
  visibility?: string;
  featured_image_url?: string;
  published_at?: Date;
}

const BASE_SELECT = `
  SELECT bp.id, bp.title, bp.slug, bp.content, bp.excerpt,
         bp.author_id, bp.visibility, bp.featured_image_url,
         bp.published_at, bp.created_at, bp.updated_at,
         u.first_name AS author_first_name,
         u.last_name AS author_last_name,
         u.profile_photo_url AS author_profile_image_url
  FROM blog_posts bp
  JOIN users u ON u.id = bp.author_id
  WHERE bp.deleted_at IS NULL`;

export class BlogPostRepository {
  async findAll(): Promise<BlogPostRow[]> {
    const result = await db.query<BlogPostRow>(
      `${BASE_SELECT}
       ORDER BY bp.created_at DESC`
    );
    return result.rows;
  }

  async findPublished(): Promise<BlogPostRow[]> {
    const result = await db.query<BlogPostRow>(
      `${BASE_SELECT} AND bp.published_at IS NOT NULL AND bp.published_at <= CURRENT_TIMESTAMP
       ORDER BY bp.published_at DESC`
    );
    return result.rows;
  }

  async findPublicPublished(): Promise<BlogPostRow[]> {
    const result = await db.query<BlogPostRow>(
      `${BASE_SELECT} AND bp.visibility = 'PUBLIC' AND bp.published_at IS NOT NULL AND bp.published_at <= CURRENT_TIMESTAMP
       ORDER BY bp.published_at DESC`
    );
    return result.rows;
  }

  async findById(id: string): Promise<BlogPostRow | null> {
    const result = await db.query<BlogPostRow>(
      `${BASE_SELECT} AND bp.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async findBySlug(slug: string): Promise<BlogPostRow | null> {
    const result = await db.query<BlogPostRow>(
      `${BASE_SELECT} AND bp.slug = $1`,
      [slug]
    );
    return result.rows[0] || null;
  }

  async create(data: CreateBlogPostData): Promise<BlogPostRow> {
    const result = await db.query<{ id: string }>(
      `INSERT INTO blog_posts (title, slug, content, excerpt, author_id, visibility, featured_image_url, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        data.title,
        data.slug,
        data.content,
        data.excerpt || null,
        data.author_id,
        data.visibility,
        data.featured_image_url || null,
        data.published_at || null,
      ]
    );
    logger.info(`Blog post created: ${result.rows[0].id}`);
    return (await this.findById(result.rows[0].id))!;
  }

  async update(id: string, data: UpdateBlogPostData): Promise<BlogPostRow | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const fields: (keyof UpdateBlogPostData)[] = [
      'title', 'slug', 'content', 'excerpt', 'visibility', 'featured_image_url', 'published_at',
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

    await db.query(
      `UPDATE blog_posts
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND deleted_at IS NULL`,
      values
    );

    logger.info(`Blog post updated: ${id}`);
    return this.findById(id);
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await db.query(
      `UPDATE blog_posts SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    const deleted = (result.rowCount ?? 0) > 0;
    if (deleted) {
      logger.info(`Blog post soft-deleted: ${id}`);
    }
    return deleted;
  }
}
