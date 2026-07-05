import db from '../models/database';
import { logger } from '../utils/logger';

export interface PresentationMeetingRow {
  id: string;
  google_event_id: string;
  total_slots: number;
  notes: string | null;
  agenda_drive_file_id: string | null;
  agenda_drive_file_name: string | null;
  agenda_drive_file_url: string | null;
  minutes_drive_file_id: string | null;
  minutes_drive_file_name: string | null;
  minutes_drive_file_url: string | null;
  event_title: string | null;
  event_date: Date | null;
  event_location: string | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PresentationReservationRow {
  id: string;
  meeting_id: string;
  user_id: string | null;
  youth_member_id: string | null;
  title: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PresentationFileRow {
  id: string;
  uploaded_by: string;
  drive_file_id: string;
  drive_file_name: string;
  drive_file_url: string | null;
  file_type: string; // 'presentation' | 'image' | 'recording'
  created_at: Date;
}

export interface ReservationWithUser extends PresentationReservationRow {
  // Either user (User account) OR youth (YouthMember record) is populated, never both.
  user_first_name: string | null;
  user_last_name: string | null;
  user_profile_photo_url: string | null;
  youth_first_name: string | null;
  youth_last_name: string | null;
  youth_parent_user_id: string | null;
}

export interface ReservationWithMeeting extends PresentationReservationRow {
  google_event_id: string;
  total_slots: number;
}

export class PresentationRepository {
  // ── Meeting methods (admin) ──

  async createMeeting(
    googleEventId: string,
    totalSlots: number,
    notes: string | null,
    createdBy: string,
    eventMetadata?: { title?: string | null; date?: string | null; location?: string | null }
  ): Promise<PresentationMeetingRow> {
    const result = await db.query<PresentationMeetingRow>(
      `INSERT INTO presentation_meetings
         (google_event_id, total_slots, notes, created_by, event_title, event_date, event_location)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        googleEventId,
        totalSlots,
        notes,
        createdBy,
        eventMetadata?.title || null,
        eventMetadata?.date || null,
        eventMetadata?.location || null,
      ]
    );
    logger.info(`Presentation meeting created: event=${googleEventId} slots=${totalSlots}`);
    return result.rows[0];
  }

  async updateMeetingEventMetadata(
    id: string,
    metadata: { title?: string | null; date?: string | null; location?: string | null }
  ): Promise<void> {
    await db.query(
      `UPDATE presentation_meetings
         SET event_title = $1, event_date = $2, event_location = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [metadata.title || null, metadata.date || null, metadata.location || null, id]
    );
  }

  async updateMeeting(
    id: string,
    updates: {
      totalSlots?: number;
      notes?: string | null;
      agendaDriveFileId?: string | null;
      agendaDriveFileName?: string | null;
      agendaDriveFileUrl?: string | null;
      minutesDriveFileId?: string | null;
      minutesDriveFileName?: string | null;
      minutesDriveFileUrl?: string | null;
    }
  ): Promise<PresentationMeetingRow | null> {
    const sets: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.totalSlots !== undefined) {
      sets.push(`total_slots = $${idx++}`);
      values.push(updates.totalSlots);
    }
    if (updates.notes !== undefined) {
      sets.push(`notes = $${idx++}`);
      values.push(updates.notes);
    }
    if (updates.agendaDriveFileId !== undefined) {
      sets.push(`agenda_drive_file_id = $${idx++}`);
      values.push(updates.agendaDriveFileId || null);
    }
    if (updates.agendaDriveFileName !== undefined) {
      sets.push(`agenda_drive_file_name = $${idx++}`);
      values.push(updates.agendaDriveFileName || null);
    }
    if (updates.agendaDriveFileUrl !== undefined) {
      sets.push(`agenda_drive_file_url = $${idx++}`);
      values.push(updates.agendaDriveFileUrl || null);
    }
    if (updates.minutesDriveFileId !== undefined) {
      sets.push(`minutes_drive_file_id = $${idx++}`);
      values.push(updates.minutesDriveFileId || null);
    }
    if (updates.minutesDriveFileName !== undefined) {
      sets.push(`minutes_drive_file_name = $${idx++}`);
      values.push(updates.minutesDriveFileName || null);
    }
    if (updates.minutesDriveFileUrl !== undefined) {
      sets.push(`minutes_drive_file_url = $${idx++}`);
      values.push(updates.minutesDriveFileUrl || null);
    }

    if (sets.length === 0) return this.findMeetingById(id);

    sets.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await db.query<PresentationMeetingRow>(
      `UPDATE presentation_meetings SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  async isUserOfficerForCurrentTerm(userId: string): Promise<boolean> {
    const termResult = await db.query<{ term_year: string }>(
      'SELECT DISTINCT term_year FROM officer_positions ORDER BY term_year DESC LIMIT 1'
    );
    if (termResult.rows.length === 0) return false;
    const currentTerm = termResult.rows[0].term_year;

    const result = await db.query<{ count: string }>(
      'SELECT COUNT(*) AS count FROM officer_positions WHERE holder_user_id = $1 AND term_year = $2',
      [userId, currentTerm]
    );
    return parseInt(result.rows[0].count, 10) > 0;
  }

  async deleteMeeting(id: string): Promise<boolean> {
    const result = await db.query(
      'DELETE FROM presentation_meetings WHERE id = $1',
      [id]
    );
    logger.info(`Presentation meeting deleted: id=${id}`);
    return (result.rowCount ?? 0) > 0;
  }

  async findMeetingById(id: string): Promise<PresentationMeetingRow | null> {
    const result = await db.query<PresentationMeetingRow>(
      'SELECT * FROM presentation_meetings WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async findMeetingByEventId(googleEventId: string): Promise<PresentationMeetingRow | null> {
    const result = await db.query<PresentationMeetingRow>(
      'SELECT * FROM presentation_meetings WHERE google_event_id = $1',
      [googleEventId]
    );
    return result.rows[0] || null;
  }

  async findAllMeetings(): Promise<PresentationMeetingRow[]> {
    const result = await db.query<PresentationMeetingRow>(
      'SELECT * FROM presentation_meetings ORDER BY created_at DESC'
    );
    return result.rows;
  }

  // ── Reservation methods (member) ──

  async createReservation(
    meetingId: string,
    presenter: { userId: string; youthMemberId?: undefined } | { userId?: undefined; youthMemberId: string },
    title: string,
    description: string | null
  ): Promise<PresentationReservationRow> {
    const userId = presenter.userId ?? null;
    const youthMemberId = presenter.youthMemberId ?? null;
    const result = await db.query<PresentationReservationRow>(
      `INSERT INTO presentation_reservations (meeting_id, user_id, youth_member_id, title, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [meetingId, userId, youthMemberId, title, description]
    );
    logger.info(`Presentation reserved: meeting=${meetingId} user=${userId} youth=${youthMemberId} title="${title}"`);
    return result.rows[0];
  }

  async updateReservation(
    id: string,
    updates: { title?: string; description?: string | null }
  ): Promise<PresentationReservationRow | null> {
    const sets: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.title !== undefined) {
      sets.push(`title = $${idx++}`);
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      sets.push(`description = $${idx++}`);
      values.push(updates.description);
    }

    if (sets.length === 0) return this.findReservationById(id);

    sets.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await db.query<PresentationReservationRow>(
      `UPDATE presentation_reservations SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  async deleteReservation(id: string): Promise<boolean> {
    const result = await db.query(
      'DELETE FROM presentation_reservations WHERE id = $1',
      [id]
    );
    logger.info(`Presentation reservation deleted: id=${id}`);
    return (result.rowCount ?? 0) > 0;
  }

  async findReservationById(id: string): Promise<PresentationReservationRow | null> {
    const result = await db.query<PresentationReservationRow>(
      'SELECT * FROM presentation_reservations WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async findReservationsByMeeting(meetingId: string): Promise<ReservationWithUser[]> {
    const result = await db.query<ReservationWithUser>(
      `SELECT r.*,
              u.first_name AS user_first_name, u.last_name AS user_last_name, u.profile_photo_url AS user_profile_photo_url,
              ym.first_name AS youth_first_name, ym.last_name AS youth_last_name, ym.parent_user_id AS youth_parent_user_id
       FROM presentation_reservations r
       LEFT JOIN users u ON u.id = r.user_id
       LEFT JOIN youth_members ym ON ym.id = r.youth_member_id
       WHERE r.meeting_id = $1
       ORDER BY r.created_at ASC`,
      [meetingId]
    );
    return result.rows;
  }

  async findReservationsByUser(userId: string): Promise<ReservationWithMeeting[]> {
    // Returns reservations the user owns directly (user_id) OR reservations made
    // for YouthMember records they parent (youth_member_id whose parent_user_id matches).
    const result = await db.query<ReservationWithMeeting>(
      `SELECT r.*, m.google_event_id, m.total_slots
       FROM presentation_reservations r
       JOIN presentation_meetings m ON m.id = r.meeting_id
       LEFT JOIN youth_members ym ON ym.id = r.youth_member_id
       WHERE r.user_id = $1 OR ym.parent_user_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  async countReservationsByMeeting(meetingId: string): Promise<number> {
    const result = await db.query<{ count: string }>(
      'SELECT COUNT(*) AS count FROM presentation_reservations WHERE meeting_id = $1',
      [meetingId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  async moveReservation(
    reservationId: string,
    newMeetingId: string
  ): Promise<PresentationReservationRow | null> {
    const result = await db.query<PresentationReservationRow>(
      `UPDATE presentation_reservations
       SET meeting_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [newMeetingId, reservationId]
    );
    logger.info(`Presentation moved: reservation=${reservationId} newMeeting=${newMeetingId}`);
    return result.rows[0] || null;
  }

  // ── File methods (many-to-many) ──

  async createFile(
    uploadedBy: string,
    driveFileId: string,
    driveFileName: string,
    driveFileUrl: string | null,
    fileType: string
  ): Promise<PresentationFileRow> {
    const result = await db.query<PresentationFileRow>(
      `INSERT INTO presentation_files (uploaded_by, drive_file_id, drive_file_name, drive_file_url, file_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [uploadedBy, driveFileId, driveFileName, driveFileUrl, fileType]
    );
    logger.info(`Presentation file created: type=${fileType} name="${driveFileName}"`);
    return result.rows[0];
  }

  async deleteFile(fileId: string): Promise<PresentationFileRow | null> {
    const file = await db.query<PresentationFileRow>(
      'SELECT * FROM presentation_files WHERE id = $1',
      [fileId]
    );
    if (!file.rows[0]) return null;

    await db.query('DELETE FROM presentation_files WHERE id = $1', [fileId]);
    logger.info(`Presentation file deleted: id=${fileId}`);
    return file.rows[0];
  }

  async findFileById(fileId: string): Promise<PresentationFileRow | null> {
    const result = await db.query<PresentationFileRow>(
      'SELECT * FROM presentation_files WHERE id = $1',
      [fileId]
    );
    return result.rows[0] || null;
  }

  async findFilesByReservation(reservationId: string): Promise<PresentationFileRow[]> {
    const result = await db.query<PresentationFileRow>(
      `SELECT f.*
       FROM presentation_files f
       JOIN presentation_reservation_files rf ON rf.file_id = f.id
       WHERE rf.reservation_id = $1
       ORDER BY f.created_at ASC`,
      [reservationId]
    );
    return result.rows;
  }

  async findFilesByUser(userId: string): Promise<PresentationFileRow[]> {
    const result = await db.query<PresentationFileRow>(
      'SELECT * FROM presentation_files WHERE uploaded_by = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }

  async linkFileToReservation(reservationId: string, fileId: string): Promise<void> {
    await db.query(
      `INSERT INTO presentation_reservation_files (reservation_id, file_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [reservationId, fileId]
    );
    logger.info(`File linked: reservation=${reservationId} file=${fileId}`);
  }

  async unlinkFileFromReservation(reservationId: string, fileId: string): Promise<void> {
    await db.query(
      'DELETE FROM presentation_reservation_files WHERE reservation_id = $1 AND file_id = $2',
      [reservationId, fileId]
    );
    logger.info(`File unlinked: reservation=${reservationId} file=${fileId}`);
  }

  async countFileLinks(fileId: string): Promise<number> {
    const result = await db.query<{ count: string }>(
      'SELECT COUNT(*) AS count FROM presentation_reservation_files WHERE file_id = $1',
      [fileId]
    );
    return parseInt(result.rows[0].count, 10);
  }
}
