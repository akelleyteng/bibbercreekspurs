import db from '../models/database';
import { logger } from '../utils/logger';

export interface EventRsvpRow {
  id: string;
  google_event_id: string;
  user_id: string;
  status: string;
  guest_count: number;
  created_at: Date;
  updated_at: Date;
}

export class EventRsvpRepository {
  async upsert(googleEventId: string, userId: string, status: string, guestCount: number = 0): Promise<EventRsvpRow> {
    const result = await db.query<EventRsvpRow>(
      `INSERT INTO event_rsvps (google_event_id, user_id, status, guest_count)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (google_event_id, user_id)
       DO UPDATE SET status = $3, guest_count = $4, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [googleEventId, userId, status, guestCount]
    );
    logger.info(`RSVP upserted: user=${userId} event=${googleEventId} status=${status}`);
    return result.rows[0];
  }

  async delete(googleEventId: string, userId: string): Promise<boolean> {
    const result = await db.query(
      'DELETE FROM event_rsvps WHERE google_event_id = $1 AND user_id = $2',
      [googleEventId, userId]
    );
    logger.info(`RSVP deleted: user=${userId} event=${googleEventId}`);
    return (result.rowCount ?? 0) > 0;
  }

  async countAttending(googleEventId: string): Promise<number> {
    const result = await db.query<{ count: string }>(
      `SELECT COALESCE(SUM(1 + guest_count), 0) AS count
       FROM event_rsvps
       WHERE google_event_id = $1
         AND status IN ('ATTENDING', 'ATTENDING_PLUS')`,
      [googleEventId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  async findByEventAndUser(googleEventId: string, userId: string): Promise<EventRsvpRow | null> {
    const result = await db.query<EventRsvpRow>(
      'SELECT * FROM event_rsvps WHERE google_event_id = $1 AND user_id = $2',
      [googleEventId, userId]
    );
    return result.rows[0] || null;
  }
}
