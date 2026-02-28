import db from '../models/database';
import { logger } from '../utils/logger';

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  actor_id: string | null;
  related_post_id: string | null;
  related_event_id: string | null;
  related_user_id: string | null;
  title: string;
  body: string | null;
  is_read: boolean;
  read_at: Date | null;
  created_at: Date;
  // Joined actor fields
  actor_first_name?: string;
  actor_last_name?: string;
  actor_profile_photo_url?: string | null;
}

export interface CreateNotificationData {
  user_id: string;
  type: string;
  actor_id?: string;
  related_post_id?: string;
  related_event_id?: string;
  related_user_id?: string;
  title: string;
  body?: string;
}

export interface CreateBulkNotificationData {
  type: string;
  actor_id?: string;
  related_post_id?: string;
  related_event_id?: string;
  related_user_id?: string;
  title: string;
  body?: string;
}

export class NotificationRepository {
  async create(data: CreateNotificationData): Promise<NotificationRow> {
    const result = await db.query<NotificationRow>(
      `INSERT INTO notifications (user_id, type, actor_id, related_post_id, related_event_id, related_user_id, title, body)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.user_id,
        data.type,
        data.actor_id || null,
        data.related_post_id || null,
        data.related_event_id || null,
        data.related_user_id || null,
        data.title,
        data.body || null,
      ]
    );
    return result.rows[0];
  }

  async createForMultipleUsers(userIds: string[], data: CreateBulkNotificationData): Promise<void> {
    if (userIds.length === 0) return;

    await db.query(
      `INSERT INTO notifications (user_id, type, actor_id, related_post_id, related_event_id, related_user_id, title, body)
       SELECT unnest($1::uuid[]), $2, $3, $4, $5, $6, $7, $8`,
      [
        userIds,
        data.type,
        data.actor_id || null,
        data.related_post_id || null,
        data.related_event_id || null,
        data.related_user_id || null,
        data.title,
        data.body || null,
      ]
    );
  }

  async findByUserId(userId: string, limit: number = 50): Promise<NotificationRow[]> {
    const result = await db.query<NotificationRow>(
      `SELECT n.*, u.first_name AS actor_first_name, u.last_name AS actor_last_name, u.profile_photo_url AS actor_profile_photo_url
       FROM notifications n
       LEFT JOIN users u ON u.id = n.actor_id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }

  async countUnread(userId: string): Promise<number> {
    const result = await db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  async markAsRead(notificationIds: string[], userId: string): Promise<void> {
    if (notificationIds.length === 0) return;

    await db.query(
      `UPDATE notifications SET is_read = true, read_at = NOW()
       WHERE id = ANY($1::uuid[]) AND user_id = $2`,
      [notificationIds, userId]
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await db.query(
      `UPDATE notifications SET is_read = true, read_at = NOW()
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
  }

  async exists(userId: string, type: string, actorId: string, relatedPostId: string): Promise<boolean> {
    const result = await db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM notifications
       WHERE user_id = $1 AND type = $2 AND actor_id = $3 AND related_post_id = $4
         AND created_at > NOW() - INTERVAL '24 hours'`,
      [userId, type, actorId, relatedPostId]
    );
    return parseInt(result.rows[0].count, 10) > 0;
  }
}
