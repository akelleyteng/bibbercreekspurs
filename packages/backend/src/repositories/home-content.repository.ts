import db from '../models/database';
import { logger } from '../utils/logger';

export interface HomeContentRow {
  id: string;
  section_type: string;
  title: string | null;
  content: string;
  image_url: string | null;
  metadata: Record<string, string> | null;
  order_index: number | null;
  is_active: boolean;
  updated_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface UpsertHomeContentData {
  section_type: string;
  title?: string | null;
  content: string;
  image_url?: string | null;
  metadata?: Record<string, string> | null;
  order_index?: number | null;
  is_active?: boolean;
  updated_by: string;
}

const SELECT_FIELDS = `id, section_type, title, content, image_url, metadata, order_index, is_active, updated_by, created_at, updated_at`;

export class HomeContentRepository {
  async findAll(): Promise<HomeContentRow[]> {
    const result = await db.query<HomeContentRow>(
      `SELECT ${SELECT_FIELDS} FROM home_page_content ORDER BY order_index ASC NULLS LAST, created_at ASC`
    );
    return result.rows;
  }

  async findActive(): Promise<HomeContentRow[]> {
    const result = await db.query<HomeContentRow>(
      `SELECT ${SELECT_FIELDS} FROM home_page_content WHERE is_active = true ORDER BY order_index ASC NULLS LAST, created_at ASC`
    );
    return result.rows;
  }

  async findBySectionType(sectionType: string): Promise<HomeContentRow | null> {
    const result = await db.query<HomeContentRow>(
      `SELECT ${SELECT_FIELDS} FROM home_page_content WHERE section_type = $1`,
      [sectionType]
    );
    return result.rows[0] || null;
  }

  async upsert(data: UpsertHomeContentData): Promise<HomeContentRow> {
    const result = await db.query<HomeContentRow>(
      `INSERT INTO home_page_content (section_type, title, content, image_url, metadata, order_index, is_active, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (section_type) DO UPDATE SET
         title = EXCLUDED.title,
         content = EXCLUDED.content,
         image_url = EXCLUDED.image_url,
         metadata = EXCLUDED.metadata,
         order_index = EXCLUDED.order_index,
         is_active = COALESCE(EXCLUDED.is_active, home_page_content.is_active),
         updated_by = EXCLUDED.updated_by,
         updated_at = CURRENT_TIMESTAMP
       RETURNING ${SELECT_FIELDS}`,
      [
        data.section_type,
        data.title || null,
        data.content,
        data.image_url || null,
        data.metadata ? JSON.stringify(data.metadata) : null,
        data.order_index ?? null,
        data.is_active ?? true,
        data.updated_by,
      ]
    );
    logger.info(`Home content upserted: ${data.section_type}`);
    return result.rows[0];
  }
}
