import db from '../models/database';
import { logger } from '../utils/logger';

export interface CommunicationRow {
  id: string;
  sender_id: string;
  subject: string;
  body: string;
  email_type: string;
  recipient_group: string;
  recipient_count: number;
  recipient_emails: string[];
  status: string;
  attachments: any[];
  error_message: string | null;
  sent_at: Date | null;
  created_at: Date;
  updated_at: Date;
  sender_first_name?: string;
  sender_last_name?: string;
  sender_email?: string;
}

export class CommunicationRepository {
  async create(data: {
    sender_id: string;
    subject: string;
    body: string;
    email_type: string;
    recipient_group: string;
    recipient_count: number;
    recipient_emails: string[];
    attachments: any[];
  }): Promise<CommunicationRow> {
    const result = await db.query<CommunicationRow>(
      `INSERT INTO admin_communications
       (sender_id, subject, body, email_type, recipient_group, recipient_count, recipient_emails, attachments, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, 'PENDING')
       RETURNING *`,
      [
        data.sender_id,
        data.subject,
        data.body,
        data.email_type,
        data.recipient_group,
        data.recipient_count,
        data.recipient_emails,
        JSON.stringify(data.attachments),
      ]
    );
    return result.rows[0];
  }

  async markSent(id: string, messageId: string | null): Promise<void> {
    await db.query(
      `UPDATE admin_communications SET status = 'SENT', sent_at = NOW() WHERE id = $1`,
      [id]
    );
  }

  async markFailed(id: string, errorMessage: string): Promise<void> {
    await db.query(
      `UPDATE admin_communications SET status = 'FAILED', error_message = $1 WHERE id = $2`,
      [errorMessage, id]
    );
  }

  async findAll(limit = 50, offset = 0): Promise<{ rows: CommunicationRow[]; total: number }> {
    try {
      const countResult = await db.query<{ count: string }>(
        'SELECT COUNT(*) FROM admin_communications'
      );
      const total = parseInt(countResult.rows[0].count, 10);

      const result = await db.query<CommunicationRow>(
        `SELECT ac.*,
                u.first_name AS sender_first_name,
                u.last_name AS sender_last_name,
                u.email AS sender_email
         FROM admin_communications ac
         JOIN users u ON ac.sender_id = u.id
         ORDER BY ac.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      return { rows: result.rows, total };
    } catch (error) {
      logger.error('Error fetching communications:', error);
      throw error;
    }
  }

  async findById(id: string): Promise<CommunicationRow | null> {
    try {
      const result = await db.query<CommunicationRow>(
        `SELECT ac.*,
                u.first_name AS sender_first_name,
                u.last_name AS sender_last_name,
                u.email AS sender_email
         FROM admin_communications ac
         JOIN users u ON ac.sender_id = u.id
         WHERE ac.id = $1`,
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error fetching communication by id:', error);
      throw error;
    }
  }
}
