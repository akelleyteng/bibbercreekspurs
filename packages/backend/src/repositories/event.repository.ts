import db from '../models/database';
import { logger } from '../utils/logger';

export interface EventRow {
  id: string;
  title: string;
  description: string;
  start_time: Date;
  end_time: Date;
  location?: string;
  visibility: string;
  event_type: string;
  external_registration_url?: string;
  image_url?: string;
  google_calendar_id?: string;
  facebook_event_id?: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
  // Joined fields
  creator_id: string;
  creator_first_name: string;
  creator_last_name: string;
  creator_profile_image_url?: string;
  registration_count: number;
}

export interface CreateEventData {
  title: string;
  description: string;
  start_time: Date;
  end_time: Date;
  location?: string;
  visibility: string;
  event_type: string;
  external_registration_url?: string;
  image_url?: string;
  created_by: string;
}

export interface UpdateEventData {
  title?: string;
  description?: string;
  start_time?: Date;
  end_time?: Date;
  location?: string;
  visibility?: string;
  event_type?: string;
  external_registration_url?: string;
  image_url?: string;
}

const BASE_SELECT = `
  SELECT e.id, e.title, e.description, e.start_time, e.end_time, e.location,
         e.visibility, e.event_type, e.external_registration_url, e.image_url,
         e.created_by, e.created_at, e.updated_at,
         u.id AS creator_id, u.first_name AS creator_first_name,
         u.last_name AS creator_last_name, u.profile_photo_url AS creator_profile_image_url,
         COALESCE((SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id AND er.status = 'REGISTERED'), 0)::int AS registration_count
  FROM events e
  JOIN users u ON u.id = e.created_by
  WHERE e.deleted_at IS NULL`;

export class EventRepository {
  async findAll(): Promise<EventRow[]> {
    const result = await db.query<EventRow>(
      `${BASE_SELECT}
       ORDER BY e.start_time ASC`
    );
    return result.rows;
  }

  async findUpcoming(): Promise<EventRow[]> {
    const result = await db.query<EventRow>(
      `${BASE_SELECT} AND e.start_time >= CURRENT_TIMESTAMP
       ORDER BY e.start_time ASC`
    );
    return result.rows;
  }

  async findPublicUpcoming(): Promise<EventRow[]> {
    const result = await db.query<EventRow>(
      `${BASE_SELECT} AND e.visibility = 'PUBLIC' AND e.start_time >= CURRENT_TIMESTAMP
       ORDER BY e.start_time ASC`
    );
    return result.rows;
  }

  async findById(id: string): Promise<EventRow | null> {
    const result = await db.query<EventRow>(
      `${BASE_SELECT} AND e.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async create(data: CreateEventData): Promise<EventRow> {
    const result = await db.query<{ id: string }>(
      `INSERT INTO events (title, description, start_time, end_time, location, visibility, event_type, external_registration_url, image_url, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        data.title,
        data.description,
        data.start_time,
        data.end_time,
        data.location || null,
        data.visibility,
        data.event_type,
        data.external_registration_url || null,
        data.image_url || null,
        data.created_by,
      ]
    );
    logger.info(`Event created: ${result.rows[0].id}`);
    // Re-fetch with JOINs
    return (await this.findById(result.rows[0].id))!;
  }

  async update(id: string, data: UpdateEventData): Promise<EventRow | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const fields: (keyof UpdateEventData)[] = [
      'title', 'description', 'start_time', 'end_time', 'location',
      'visibility', 'event_type', 'external_registration_url', 'image_url',
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
      `UPDATE events
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND deleted_at IS NULL`,
      values
    );

    logger.info(`Event updated: ${id}`);
    return this.findById(id);
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await db.query(
      `UPDATE events SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    const deleted = (result.rowCount ?? 0) > 0;
    if (deleted) {
      logger.info(`Event soft-deleted: ${id}`);
    }
    return deleted;
  }

  async addRegistration(eventId: string, userId: string): Promise<void> {
    await db.query(
      `INSERT INTO event_registrations (event_id, user_id, status)
       VALUES ($1, $2, 'REGISTERED')
       ON CONFLICT (event_id, user_id) DO UPDATE SET status = 'REGISTERED'`,
      [eventId, userId]
    );
    logger.info(`User ${userId} registered for event ${eventId}`);
  }

  async cancelRegistration(eventId: string, userId: string): Promise<boolean> {
    const result = await db.query(
      `DELETE FROM event_registrations WHERE event_id = $1 AND user_id = $2`,
      [eventId, userId]
    );
    const cancelled = (result.rowCount ?? 0) > 0;
    if (cancelled) {
      logger.info(`User ${userId} cancelled registration for event ${eventId}`);
    }
    return cancelled;
  }

  async getUserRegistrationStatus(eventId: string, userId: string): Promise<string | null> {
    const result = await db.query<{ status: string }>(
      `SELECT status FROM event_registrations WHERE event_id = $1 AND user_id = $2`,
      [eventId, userId]
    );
    return result.rows[0]?.status || null;
  }
}
