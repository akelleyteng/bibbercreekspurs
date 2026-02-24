import { Resolver, Query, Mutation, Arg, Ctx } from 'type-graphql';
import {
  PresentationMeetingGQL,
  PresentationReservationGQL,
  PresentationReservationUserGQL,
  PresentationFileGQL,
} from '../types/Presentation.type';
import {
  EnablePresentationsInput,
  UpdatePresentationMeetingInput,
  ReservePresentationInput,
  UpdateReservationInput,
  AddPresentationFileInput,
  MovePresentationInput,
} from '../inputs/PresentationInput';
import {
  PresentationRepository,
  PresentationFileRow,
  ReservationWithUser,
  ReservationWithMeeting,
} from '../../repositories/presentation.repository';
import { UserRepository } from '../../repositories/user.repository';
import { verifyAccessToken } from '../../services/auth.service';
import { listCalendarEvents, getCalendarEvent } from '../../services/google-calendar.service';
import * as driveService from '../../services/google-drive.service';
import { Context } from '../context';
import { GraphQLError } from 'graphql';
import { logger } from '../../utils/logger';
import { Role } from '@4hclub/shared';
import { env } from '../../config/env';

@Resolver()
export class PresentationResolver {
  private presRepo: PresentationRepository;
  private userRepo: UserRepository;

  constructor() {
    this.presRepo = new PresentationRepository();
    this.userRepo = new UserRepository();
  }

  private requireAuth(context: Context): { userId: string; email: string } {
    const authHeader = context.req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    if (!payload.email) {
      throw new GraphQLError('Token missing email — please log in again', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    return { userId: payload.userId, email: payload.email };
  }

  private async requireAdmin(context: Context): Promise<string> {
    const { userId } = this.requireAuth(context);
    const user = await this.userRepo.findById(userId);
    if (!user || user.role !== Role.ADMIN) {
      throw new GraphQLError('Admin access required', {
        extensions: { code: 'FORBIDDEN' },
      });
    }
    return userId;
  }

  private mapFile(row: PresentationFileRow): PresentationFileGQL {
    const f = new PresentationFileGQL();
    f.id = row.id;
    f.driveFileId = row.drive_file_id;
    f.driveFileName = row.drive_file_name;
    f.driveFileUrl = row.drive_file_url || undefined;
    f.fileType = row.file_type;
    f.createdAt = row.created_at.toISOString();
    return f;
  }

  private async mapReservation(row: ReservationWithUser): Promise<PresentationReservationGQL> {
    const res = new PresentationReservationGQL();
    res.id = row.id;
    res.meetingId = row.meeting_id;
    res.title = row.title;
    res.description = row.description || undefined;
    res.createdAt = row.created_at.toISOString();
    res.updatedAt = row.updated_at.toISOString();

    const user = new PresentationReservationUserGQL();
    user.id = row.user_id;
    user.firstName = row.first_name;
    user.lastName = row.last_name;
    user.profilePhotoUrl = row.profile_photo_url || undefined;
    res.user = user;

    // Load attached files
    const files = await this.presRepo.findFilesByReservation(row.id);
    res.files = files.map((f) => this.mapFile(f));

    return res;
  }

  // ── Queries ──

  @Query(() => [PresentationMeetingGQL])
  async presentationMeetings(
    @Ctx() context: Context
  ): Promise<PresentationMeetingGQL[]> {
    this.requireAuth(context);

    const meetings = await this.presRepo.findAllMeetings();
    const calendarEvents = await listCalendarEvents();

    const results: PresentationMeetingGQL[] = [];

    for (const meeting of meetings) {
      const calEvent = calendarEvents.find((e) => e.id === meeting.google_event_id);

      const reservations = await this.presRepo.findReservationsByMeeting(meeting.id);

      const gql = new PresentationMeetingGQL();
      gql.id = meeting.id;
      gql.googleEventId = meeting.google_event_id;
      gql.totalSlots = meeting.total_slots;
      gql.notes = meeting.notes || undefined;
      gql.slotsRemaining = Math.max(0, meeting.total_slots - reservations.length);
      gql.eventTitle = calEvent?.title;
      gql.eventDate = calEvent?.startTime;
      gql.eventLocation = calEvent?.location;
      gql.reservations = await Promise.all(reservations.map((r) => this.mapReservation(r)));
      gql.createdAt = meeting.created_at.toISOString();

      results.push(gql);
    }

    // Sort by event date (upcoming first), fall back to created_at
    results.sort((a, b) => {
      const dateA = a.eventDate || a.createdAt;
      const dateB = b.eventDate || b.createdAt;
      return dateA.localeCompare(dateB);
    });

    return results;
  }

  @Query(() => [PresentationReservationGQL])
  async myPresentations(
    @Ctx() context: Context
  ): Promise<PresentationReservationGQL[]> {
    const { userId } = this.requireAuth(context);

    const reservations = await this.presRepo.findReservationsByUser(userId);
    const user = await this.userRepo.findById(userId);

    const results: PresentationReservationGQL[] = [];
    for (const row of reservations) {
      const res = new PresentationReservationGQL();
      res.id = row.id;
      res.meetingId = row.meeting_id;
      res.title = row.title;
      res.description = row.description || undefined;
      res.createdAt = row.created_at.toISOString();
      res.updatedAt = row.updated_at.toISOString();
      res.googleEventId = row.google_event_id;

      const u = new PresentationReservationUserGQL();
      u.id = row.user_id;
      u.firstName = user?.first_name || '';
      u.lastName = user?.last_name || '';
      u.profilePhotoUrl = user?.profile_photo_url || undefined;
      res.user = u;

      const files = await this.presRepo.findFilesByReservation(row.id);
      res.files = files.map((f) => this.mapFile(f));

      results.push(res);
    }

    return results;
  }

  @Query(() => String, { nullable: true })
  async presentationsFolderId(
    @Ctx() context: Context
  ): Promise<string | null> {
    this.requireAuth(context);
    return env.GOOGLE_DRIVE_PRESENTATIONS_FOLDER_ID || null;
  }

  @Query(() => String, { nullable: true })
  async presentationsImagesFolderId(
    @Ctx() context: Context
  ): Promise<string | null> {
    this.requireAuth(context);
    return env.GOOGLE_DRIVE_PRESENTATIONS_IMAGES_FOLDER_ID || null;
  }

  @Query(() => String, { nullable: true })
  async presentationsRecordingsFolderId(
    @Ctx() context: Context
  ): Promise<string | null> {
    this.requireAuth(context);
    return env.GOOGLE_DRIVE_PRESENTATIONS_RECORDINGS_FOLDER_ID || null;
  }

  // ── Admin Mutations ──

  @Mutation(() => PresentationMeetingGQL)
  async enablePresentations(
    @Arg('input') input: EnablePresentationsInput,
    @Ctx() context: Context
  ): Promise<PresentationMeetingGQL> {
    const userId = await this.requireAdmin(context);

    const calEvent = await getCalendarEvent(input.googleEventId);
    if (!calEvent) {
      throw new GraphQLError('Calendar event not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const existing = await this.presRepo.findMeetingByEventId(input.googleEventId);
    if (existing) {
      throw new GraphQLError('Presentations already enabled for this meeting', {
        extensions: { code: 'BAD_INPUT' },
      });
    }

    const meeting = await this.presRepo.createMeeting(
      input.googleEventId,
      input.totalSlots,
      input.notes || null,
      userId
    );

    const gql = new PresentationMeetingGQL();
    gql.id = meeting.id;
    gql.googleEventId = meeting.google_event_id;
    gql.totalSlots = meeting.total_slots;
    gql.notes = meeting.notes || undefined;
    gql.slotsRemaining = meeting.total_slots;
    gql.eventTitle = calEvent.title;
    gql.eventDate = calEvent.startTime;
    gql.eventLocation = calEvent.location;
    gql.reservations = [];
    gql.createdAt = meeting.created_at.toISOString();

    return gql;
  }

  @Mutation(() => PresentationMeetingGQL)
  async updatePresentationMeeting(
    @Arg('input') input: UpdatePresentationMeetingInput,
    @Ctx() context: Context
  ): Promise<PresentationMeetingGQL> {
    await this.requireAdmin(context);

    const meeting = await this.presRepo.updateMeeting(input.id, {
      totalSlots: input.totalSlots,
      notes: input.notes,
    });

    if (!meeting) {
      throw new GraphQLError('Presentation meeting not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const reservations = await this.presRepo.findReservationsByMeeting(meeting.id);
    const calEvent = await getCalendarEvent(meeting.google_event_id);

    const gql = new PresentationMeetingGQL();
    gql.id = meeting.id;
    gql.googleEventId = meeting.google_event_id;
    gql.totalSlots = meeting.total_slots;
    gql.notes = meeting.notes || undefined;
    gql.slotsRemaining = Math.max(0, meeting.total_slots - reservations.length);
    gql.eventTitle = calEvent?.title;
    gql.eventDate = calEvent?.startTime;
    gql.eventLocation = calEvent?.location;
    gql.reservations = await Promise.all(reservations.map((r) => this.mapReservation(r)));
    gql.createdAt = meeting.created_at.toISOString();

    return gql;
  }

  @Mutation(() => Boolean)
  async disablePresentations(
    @Arg('meetingId') meetingId: string,
    @Ctx() context: Context
  ): Promise<boolean> {
    await this.requireAdmin(context);

    const meeting = await this.presRepo.findMeetingById(meetingId);
    if (!meeting) {
      throw new GraphQLError('Presentation meeting not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return this.presRepo.deleteMeeting(meetingId);
  }

  // ── Member Mutations ──

  @Mutation(() => PresentationReservationGQL)
  async reservePresentation(
    @Arg('input') input: ReservePresentationInput,
    @Ctx() context: Context
  ): Promise<PresentationReservationGQL> {
    const { userId } = this.requireAuth(context);

    const meeting = await this.presRepo.findMeetingById(input.meetingId);
    if (!meeting) {
      throw new GraphQLError('Presentation meeting not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const count = await this.presRepo.countReservationsByMeeting(input.meetingId);
    if (count >= meeting.total_slots) {
      throw new GraphQLError('No presentation slots available for this meeting', {
        extensions: { code: 'BAD_INPUT' },
      });
    }

    const reservation = await this.presRepo.createReservation(
      input.meetingId,
      userId,
      input.title,
      input.description || null
    );

    const user = await this.userRepo.findById(userId);

    const res = new PresentationReservationGQL();
    res.id = reservation.id;
    res.meetingId = reservation.meeting_id;
    res.title = reservation.title;
    res.description = reservation.description || undefined;
    res.files = [];
    res.createdAt = reservation.created_at.toISOString();
    res.updatedAt = reservation.updated_at.toISOString();

    const u = new PresentationReservationUserGQL();
    u.id = userId;
    u.firstName = user?.first_name || '';
    u.lastName = user?.last_name || '';
    u.profilePhotoUrl = user?.profile_photo_url || undefined;
    res.user = u;

    return res;
  }

  @Mutation(() => PresentationReservationGQL)
  async updatePresentationReservation(
    @Arg('input') input: UpdateReservationInput,
    @Ctx() context: Context
  ): Promise<PresentationReservationGQL> {
    const { userId } = this.requireAuth(context);

    const existing = await this.presRepo.findReservationById(input.id);
    if (!existing) {
      throw new GraphQLError('Reservation not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }
    if (existing.user_id !== userId) {
      throw new GraphQLError('You can only edit your own presentations', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    const updated = await this.presRepo.updateReservation(input.id, {
      title: input.title,
      description: input.description,
    });

    const user = await this.userRepo.findById(userId);
    const files = await this.presRepo.findFilesByReservation(input.id);

    const res = new PresentationReservationGQL();
    res.id = updated!.id;
    res.meetingId = updated!.meeting_id;
    res.title = updated!.title;
    res.description = updated!.description || undefined;
    res.files = files.map((f) => this.mapFile(f));
    res.createdAt = updated!.created_at.toISOString();
    res.updatedAt = updated!.updated_at.toISOString();

    const u = new PresentationReservationUserGQL();
    u.id = userId;
    u.firstName = user?.first_name || '';
    u.lastName = user?.last_name || '';
    u.profilePhotoUrl = user?.profile_photo_url || undefined;
    res.user = u;

    return res;
  }

  @Mutation(() => PresentationFileGQL)
  async addPresentationFile(
    @Arg('input') input: AddPresentationFileInput,
    @Ctx() context: Context
  ): Promise<PresentationFileGQL> {
    const { userId } = this.requireAuth(context);

    const reservation = await this.presRepo.findReservationById(input.reservationId);
    if (!reservation) {
      throw new GraphQLError('Reservation not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }
    if (reservation.user_id !== userId) {
      throw new GraphQLError('You can only add files to your own presentations', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    // Create file record and link to reservation
    const file = await this.presRepo.createFile(
      userId,
      input.driveFileId,
      input.driveFileName,
      input.driveFileUrl || null,
      input.fileType
    );

    await this.presRepo.linkFileToReservation(input.reservationId, file.id);

    return this.mapFile(file);
  }

  @Mutation(() => Boolean)
  async removePresentationFile(
    @Arg('reservationId') reservationId: string,
    @Arg('fileId') fileId: string,
    @Ctx() context: Context
  ): Promise<boolean> {
    const { userId } = this.requireAuth(context);

    const reservation = await this.presRepo.findReservationById(reservationId);
    if (!reservation) {
      throw new GraphQLError('Reservation not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }
    if (reservation.user_id !== userId) {
      throw new GraphQLError('You can only remove files from your own presentations', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    // Unlink from this reservation
    await this.presRepo.unlinkFileFromReservation(reservationId, fileId);

    // If no more reservations link to this file, delete the file record and Drive file
    const linkCount = await this.presRepo.countFileLinks(fileId);
    if (linkCount === 0) {
      const file = await this.presRepo.deleteFile(fileId);
      if (file) {
        try {
          await driveService.deleteFile(file.drive_file_id);
          logger.info(`Deleted orphaned Drive file: ${file.drive_file_id}`);
        } catch (err: any) {
          logger.warn('Failed to delete Drive file', {
            driveFileId: file.drive_file_id,
            error: err?.message,
          });
        }
      }
    }

    return true;
  }

  @Mutation(() => Boolean)
  async linkExistingFileToReservation(
    @Arg('reservationId') reservationId: string,
    @Arg('fileId') fileId: string,
    @Ctx() context: Context
  ): Promise<boolean> {
    const { userId } = this.requireAuth(context);

    const reservation = await this.presRepo.findReservationById(reservationId);
    if (!reservation) {
      throw new GraphQLError('Reservation not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }
    if (reservation.user_id !== userId) {
      throw new GraphQLError('You can only link files to your own presentations', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    const file = await this.presRepo.findFileById(fileId);
    if (!file) {
      throw new GraphQLError('File not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }
    if (file.uploaded_by !== userId) {
      throw new GraphQLError('You can only link your own files', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    await this.presRepo.linkFileToReservation(reservationId, fileId);
    return true;
  }

  @Mutation(() => Boolean)
  async deletePresentation(
    @Arg('reservationId') reservationId: string,
    @Ctx() context: Context
  ): Promise<boolean> {
    const { userId } = this.requireAuth(context);

    const existing = await this.presRepo.findReservationById(reservationId);
    if (!existing) {
      throw new GraphQLError('Reservation not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }
    if (existing.user_id !== userId) {
      throw new GraphQLError('You can only delete your own presentations', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    // Get files linked to this reservation
    const files = await this.presRepo.findFilesByReservation(reservationId);

    // Delete the reservation (cascade removes join table entries)
    await this.presRepo.deleteReservation(reservationId);

    // Clean up orphaned files
    for (const file of files) {
      const linkCount = await this.presRepo.countFileLinks(file.id);
      if (linkCount === 0) {
        await this.presRepo.deleteFile(file.id);
        try {
          await driveService.deleteFile(file.drive_file_id);
          logger.info(`Deleted orphaned Drive file: ${file.drive_file_id}`);
        } catch (err: any) {
          logger.warn('Failed to delete Drive file', {
            driveFileId: file.drive_file_id,
            error: err?.message,
          });
        }
      }
    }

    return true;
  }

  @Mutation(() => PresentationReservationGQL)
  async movePresentation(
    @Arg('input') input: MovePresentationInput,
    @Ctx() context: Context
  ): Promise<PresentationReservationGQL> {
    const { userId } = this.requireAuth(context);

    const existing = await this.presRepo.findReservationById(input.reservationId);
    if (!existing) {
      throw new GraphQLError('Reservation not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }
    if (existing.user_id !== userId) {
      throw new GraphQLError('You can only move your own presentations', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    const destMeeting = await this.presRepo.findMeetingById(input.newMeetingId);
    if (!destMeeting) {
      throw new GraphQLError('Destination meeting not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const destCount = await this.presRepo.countReservationsByMeeting(input.newMeetingId);
    if (destCount >= destMeeting.total_slots) {
      throw new GraphQLError('No slots available at the destination meeting', {
        extensions: { code: 'BAD_INPUT' },
      });
    }

    const moved = await this.presRepo.moveReservation(input.reservationId, input.newMeetingId);
    const user = await this.userRepo.findById(userId);
    const files = await this.presRepo.findFilesByReservation(input.reservationId);

    const res = new PresentationReservationGQL();
    res.id = moved!.id;
    res.meetingId = moved!.meeting_id;
    res.title = moved!.title;
    res.description = moved!.description || undefined;
    res.files = files.map((f) => this.mapFile(f));
    res.createdAt = moved!.created_at.toISOString();
    res.updatedAt = moved!.updated_at.toISOString();

    const u = new PresentationReservationUserGQL();
    u.id = userId;
    u.firstName = user?.first_name || '';
    u.lastName = user?.last_name || '';
    u.profilePhotoUrl = user?.profile_photo_url || undefined;
    res.user = u;

    return res;
  }
}
