import { Resolver, Query, Mutation, Arg, Ctx, Int } from 'type-graphql';
import {
  PresentationMeetingGQL,
  PresentationReservationGQL,
  PresentationReservationUserGQL,
  PresentationReservationYouthMemberGQL,
  PresentationFileGQL,
} from '../types/Presentation.type';
import {
  EnablePresentationsInput,
  UpdatePresentationMeetingInput,
  ReservePresentationInput,
  UpdateReservationInput,
  AddPresentationFileInput,
  MovePresentationInput,
  EmailAgendaInput,
} from '../inputs/PresentationInput';
import {
  PresentationRepository,
  PresentationFileRow,
  ReservationWithUser,
  ReservationWithMeeting,
} from '../../repositories/presentation.repository';
import { UserRepository } from '../../repositories/user.repository';
import { FamilyLinkRepository } from '../../repositories/family-link.repository';
import { YouthMemberRepository } from '../../repositories/youth-member.repository';
import { verifyAccessToken } from '../../services/auth.service';
import { listCalendarEvents, getCalendarEvent, addAttendeeToEvent } from '../../services/google-calendar.service';
import { EventRsvpRepository } from '../../repositories/event-rsvp.repository';
import * as driveService from '../../services/google-drive.service';
import db from '../../models/database';
import { Context } from '../context';
import { GraphQLError } from 'graphql';
import { logger } from '../../utils/logger';
import { Role } from '@4hclub/shared';
import { env } from '../../config/env';
import { emailService } from '../../services/email.service';

@Resolver()
export class PresentationResolver {
  private presRepo: PresentationRepository;
  private userRepo: UserRepository;
  private familyLinkRepo: FamilyLinkRepository;
  private rsvpRepo: EventRsvpRepository;
  private youthMemberRepo: YouthMemberRepository;

  constructor() {
    this.presRepo = new PresentationRepository();
    this.userRepo = new UserRepository();
    this.familyLinkRepo = new FamilyLinkRepository();
    this.rsvpRepo = new EventRsvpRepository();
    this.youthMemberRepo = new YouthMemberRepository();
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

  private async requireManagerAccess(context: Context): Promise<string> {
    const { userId } = this.requireAuth(context);
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }
    if (user.role === Role.ADMIN || user.role === Role.ADULT_LEADER) {
      return userId;
    }
    const isOfficer = await this.presRepo.isUserOfficerForCurrentTerm(userId);
    if (isOfficer) {
      return userId;
    }
    throw new GraphQLError('Manager access required (admin, adult leader, or officer)', {
      extensions: { code: 'FORBIDDEN' },
    });
  }

  private async isManager(userId: string): Promise<boolean> {
    const user = await this.userRepo.findById(userId);
    if (!user) return false;
    if (user.role === Role.ADMIN || user.role === Role.ADULT_LEADER) return true;
    return this.presRepo.isUserOfficerForCurrentTerm(userId);
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

    if (row.user_id) {
      const user = new PresentationReservationUserGQL();
      user.id = row.user_id;
      user.firstName = row.user_first_name || '';
      user.lastName = row.user_last_name || '';
      user.profilePhotoUrl = row.user_profile_photo_url || undefined;
      res.user = user;
    } else if (row.youth_member_id) {
      const ym = new PresentationReservationYouthMemberGQL();
      ym.id = row.youth_member_id;
      ym.firstName = row.youth_first_name || '';
      ym.lastName = row.youth_last_name || '';
      ym.parentUserId = row.youth_parent_user_id || '';
      res.youthMember = ym;
    }

    // Load attached files
    const files = await this.presRepo.findFilesByReservation(row.id);
    res.files = files.map((f) => this.mapFile(f));

    return res;
  }

  // Returns true if the auth user can edit/delete the given reservation:
  // - Owns it directly (user_id matches)
  // - Is the parent of the YouthMember it was reserved for
  // - Is a manager (admin/adult leader/officer)
  private async canEditReservation(
    reservation: { user_id: string | null; youth_member_id: string | null },
    authUserId: string
  ): Promise<boolean> {
    if (reservation.user_id && reservation.user_id === authUserId) return true;
    if (reservation.youth_member_id) {
      const ym = await this.youthMemberRepo.findById(reservation.youth_member_id);
      if (ym?.parent_user_id === authUserId) return true;
    }
    return this.isManager(authUserId);
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

      // Prefer live calendar data when available; fall back to persisted metadata
      // so past/deleted events still display title/date/location.
      let title = calEvent?.title ?? meeting.event_title ?? undefined;
      let date = calEvent?.startTime ?? (meeting.event_date ? meeting.event_date.toISOString() : undefined);
      let location = calEvent?.location ?? meeting.event_location ?? undefined;

      // Opportunistic backfill: if the meeting has no persisted metadata but we
      // have it live, save it so it survives future calendar deletions.
      if (calEvent && !meeting.event_title && !meeting.event_date) {
        await this.presRepo.updateMeetingEventMetadata(meeting.id, {
          title: calEvent.title,
          date: calEvent.startTime,
          location: calEvent.location,
        });
      } else if (!calEvent && !meeting.event_title && !meeting.event_date) {
        // No live data and no persisted data — try a one-off lookup (covers
        // past events outside the upcoming-events window).
        try {
          const fetched = await getCalendarEvent(meeting.google_event_id);
          if (fetched) {
            title = fetched.title;
            date = fetched.startTime;
            location = fetched.location;
            await this.presRepo.updateMeetingEventMetadata(meeting.id, {
              title: fetched.title,
              date: fetched.startTime,
              location: fetched.location,
            });
          }
        } catch (err: any) {
          logger.warn('Failed to fetch calendar event for backfill', { eventId: meeting.google_event_id, error: err?.message });
        }
      }

      const reservations = await this.presRepo.findReservationsByMeeting(meeting.id);

      const gql = new PresentationMeetingGQL();
      gql.id = meeting.id;
      gql.googleEventId = meeting.google_event_id;
      gql.totalSlots = meeting.total_slots;
      gql.notes = meeting.notes || undefined;
      gql.slotsRemaining = Math.max(0, meeting.total_slots - reservations.length);
      gql.eventTitle = title;
      gql.eventDate = date;
      gql.eventLocation = location;
      gql.agendaDriveFileId = meeting.agenda_drive_file_id || undefined;
      gql.agendaDriveFileName = meeting.agenda_drive_file_name || undefined;
      gql.agendaDriveFileUrl = meeting.agenda_drive_file_url || undefined;
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

      if (row.user_id) {
        const presenter = await this.userRepo.findById(row.user_id);
        const u = new PresentationReservationUserGQL();
        u.id = row.user_id;
        u.firstName = presenter?.first_name || '';
        u.lastName = presenter?.last_name || '';
        u.profilePhotoUrl = presenter?.profile_photo_url || undefined;
        res.user = u;
      } else if (row.youth_member_id) {
        const ym = await this.youthMemberRepo.findById(row.youth_member_id);
        const presenter = new PresentationReservationYouthMemberGQL();
        presenter.id = row.youth_member_id;
        presenter.firstName = ym?.first_name || '';
        presenter.lastName = ym?.last_name || '';
        presenter.parentUserId = ym?.parent_user_id || '';
        res.youthMember = presenter;
      }

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
    const userId = await this.requireManagerAccess(context);

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
      userId,
      { title: calEvent.title, date: calEvent.startTime, location: calEvent.location }
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
    await this.requireManagerAccess(context);

    const meeting = await this.presRepo.updateMeeting(input.id, {
      totalSlots: input.totalSlots,
      notes: input.notes,
      agendaDriveFileId: input.agendaDriveFileId,
      agendaDriveFileName: input.agendaDriveFileName,
      agendaDriveFileUrl: input.agendaDriveFileUrl,
      minutesDriveFileId: input.minutesDriveFileId,
      minutesDriveFileName: input.minutesDriveFileName,
      minutesDriveFileUrl: input.minutesDriveFileUrl,
    });

    if (!meeting) {
      throw new GraphQLError('Presentation meeting not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const reservations = await this.presRepo.findReservationsByMeeting(meeting.id);
    const calEvent = await getCalendarEvent(meeting.google_event_id);

    // Refresh persisted metadata when the calendar event is reachable
    if (calEvent) {
      await this.presRepo.updateMeetingEventMetadata(meeting.id, {
        title: calEvent.title,
        date: calEvent.startTime,
        location: calEvent.location,
      });
    }

    const gql = new PresentationMeetingGQL();
    gql.id = meeting.id;
    gql.googleEventId = meeting.google_event_id;
    gql.totalSlots = meeting.total_slots;
    gql.notes = meeting.notes || undefined;
    gql.slotsRemaining = Math.max(0, meeting.total_slots - reservations.length);
    gql.eventTitle = calEvent?.title ?? meeting.event_title ?? undefined;
    gql.eventDate = calEvent?.startTime ?? (meeting.event_date ? meeting.event_date.toISOString() : undefined);
    gql.eventLocation = calEvent?.location ?? meeting.event_location ?? undefined;
    gql.agendaDriveFileId = meeting.agenda_drive_file_id || undefined;
    gql.agendaDriveFileName = meeting.agenda_drive_file_name || undefined;
    gql.agendaDriveFileUrl = meeting.agenda_drive_file_url || undefined;
    gql.minutesDriveFileId = meeting.minutes_drive_file_id || undefined;
    gql.minutesDriveFileName = meeting.minutes_drive_file_name || undefined;
    gql.minutesDriveFileUrl = meeting.minutes_drive_file_url || undefined;
    gql.reservations = await Promise.all(reservations.map((r) => this.mapReservation(r)));
    gql.createdAt = meeting.created_at.toISOString();

    return gql;
  }

  @Mutation(() => Boolean)
  async disablePresentations(
    @Arg('meetingId') meetingId: string,
    @Ctx() context: Context
  ): Promise<boolean> {
    await this.requireManagerAccess(context);

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
    const { userId: authUserId } = this.requireAuth(context);

    if (input.userId && input.youthMemberId) {
      throw new GraphQLError('Specify either userId or youthMemberId, not both', {
        extensions: { code: 'BAD_INPUT' },
      });
    }

    const authUser = await this.userRepo.findById(authUserId);
    if (!authUser) {
      throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    }

    // Resolve the presenter (User account or YouthMember record)
    let targetUserId: string | null = null;
    let targetYouthMemberId: string | null = null;

    if (input.youthMemberId) {
      const ym = await this.youthMemberRepo.findById(input.youthMemberId);
      if (!ym) {
        throw new GraphQLError('Youth member not found', { extensions: { code: 'NOT_FOUND' } });
      }
      // Permission: admin/adult leader can reserve for any YouthMember; parent only for their own
      if (
        authUser.role !== Role.ADMIN &&
        authUser.role !== Role.ADULT_LEADER &&
        ym.parent_user_id !== authUserId
      ) {
        throw new GraphQLError('You can only reserve for your own youth members', {
          extensions: { code: 'FORBIDDEN' },
        });
      }
      targetYouthMemberId = ym.id;
    } else {
      targetUserId = input.userId || authUserId;
      // Permission check when reserving on behalf of another User account
      if (targetUserId !== authUserId) {
        if (authUser.role === Role.ADMIN || authUser.role === Role.ADULT_LEADER) {
          // Admin/Adult Leader can reserve for any User account
        } else if (authUser.role === Role.PARENT) {
          const linkedChildren = await this.familyLinkRepo.findByParentId(authUserId);
          const isLinked = linkedChildren.some((c) => c.id === targetUserId);
          if (!isLinked) {
            throw new GraphQLError('You can only reserve for your linked youth members', {
              extensions: { code: 'FORBIDDEN' },
            });
          }
        } else {
          throw new GraphQLError('You cannot reserve on behalf of another member', {
            extensions: { code: 'FORBIDDEN' },
          });
        }
      }
    }

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
      targetUserId
        ? { userId: targetUserId }
        : { youthMemberId: targetYouthMemberId! },
      input.title,
      input.description || null
    );

    const res = new PresentationReservationGQL();
    res.id = reservation.id;
    res.meetingId = reservation.meeting_id;
    res.title = reservation.title;
    res.description = reservation.description || undefined;
    res.files = [];
    res.createdAt = reservation.created_at.toISOString();
    res.updatedAt = reservation.updated_at.toISOString();

    if (targetUserId) {
      const targetUser = await this.userRepo.findById(targetUserId);

      // Auto-RSVP the presenter as ATTENDING (skip if already attending to preserve guest count)
      try {
        const existingRsvp = await this.rsvpRepo.findByEventAndUser(meeting.google_event_id, targetUserId);
        if (!existingRsvp || (existingRsvp.status !== 'ATTENDING' && existingRsvp.status !== 'ATTENDING_PLUS')) {
          await this.rsvpRepo.upsert(meeting.google_event_id, targetUserId, 'ATTENDING', 0);
          logger.info(`Auto-RSVP'd user ${targetUserId} as ATTENDING for event ${meeting.google_event_id}`);
        }
      } catch (rsvpError: any) {
        logger.warn('Auto-RSVP failed (reservation still created)', {
          eventId: meeting.google_event_id, userId: targetUserId, error: rsvpError?.message,
        });
      }

      // Sync to Google Calendar (fire-and-forget)
      try {
        if (targetUser?.email) {
          addAttendeeToEvent(meeting.google_event_id, targetUser.email);
        }
      } catch (calError: any) {
        logger.warn('Calendar attendee sync failed for auto-RSVP', {
          eventId: meeting.google_event_id, userId: targetUserId, error: calError?.message,
        });
      }

      const u = new PresentationReservationUserGQL();
      u.id = targetUserId;
      u.firstName = targetUser?.first_name || '';
      u.lastName = targetUser?.last_name || '';
      u.profilePhotoUrl = targetUser?.profile_photo_url || undefined;
      res.user = u;
    } else if (targetYouthMemberId) {
      const ym = await this.youthMemberRepo.findById(targetYouthMemberId);
      const presenter = new PresentationReservationYouthMemberGQL();
      presenter.id = targetYouthMemberId;
      presenter.firstName = ym?.first_name || '';
      presenter.lastName = ym?.last_name || '';
      presenter.parentUserId = ym?.parent_user_id || '';
      res.youthMember = presenter;
    }

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
    if (!(await this.canEditReservation(existing, userId))) {
      throw new GraphQLError('You can only edit your own presentations', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    const updated = await this.presRepo.updateReservation(input.id, {
      title: input.title,
      description: input.description,
    });

    const files = await this.presRepo.findFilesByReservation(input.id);

    const res = new PresentationReservationGQL();
    res.id = updated!.id;
    res.meetingId = updated!.meeting_id;
    res.title = updated!.title;
    res.description = updated!.description || undefined;
    res.files = files.map((f) => this.mapFile(f));
    res.createdAt = updated!.created_at.toISOString();
    res.updatedAt = updated!.updated_at.toISOString();

    if (existing.user_id) {
      const ownerUser = await this.userRepo.findById(existing.user_id);
      const u = new PresentationReservationUserGQL();
      u.id = existing.user_id;
      u.firstName = ownerUser?.first_name || '';
      u.lastName = ownerUser?.last_name || '';
      u.profilePhotoUrl = ownerUser?.profile_photo_url || undefined;
      res.user = u;
    } else if (existing.youth_member_id) {
      const ym = await this.youthMemberRepo.findById(existing.youth_member_id);
      const presenter = new PresentationReservationYouthMemberGQL();
      presenter.id = existing.youth_member_id;
      presenter.firstName = ym?.first_name || '';
      presenter.lastName = ym?.last_name || '';
      presenter.parentUserId = ym?.parent_user_id || '';
      res.youthMember = presenter;
    }

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
    if (!(await this.canEditReservation(reservation, userId))) {
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
    if (!(await this.canEditReservation(reservation, userId))) {
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
    if (!(await this.canEditReservation(reservation, userId))) {
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
      const canManage = await this.isManager(userId);
      if (!canManage) {
        throw new GraphQLError('You can only link your own files', {
          extensions: { code: 'FORBIDDEN' },
        });
      }
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
    if (!(await this.canEditReservation(existing, userId))) {
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
    if (!(await this.canEditReservation(existing, userId))) {
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
    const files = await this.presRepo.findFilesByReservation(input.reservationId);

    const res = new PresentationReservationGQL();
    res.id = moved!.id;
    res.meetingId = moved!.meeting_id;
    res.title = moved!.title;
    res.description = moved!.description || undefined;
    res.files = files.map((f) => this.mapFile(f));
    res.createdAt = moved!.created_at.toISOString();
    res.updatedAt = moved!.updated_at.toISOString();

    if (existing.user_id) {
      const ownerUser = await this.userRepo.findById(existing.user_id);
      const u = new PresentationReservationUserGQL();
      u.id = existing.user_id;
      u.firstName = ownerUser?.first_name || '';
      u.lastName = ownerUser?.last_name || '';
      u.profilePhotoUrl = ownerUser?.profile_photo_url || undefined;
      res.user = u;
    } else if (existing.youth_member_id) {
      const ym = await this.youthMemberRepo.findById(existing.youth_member_id);
      const presenter = new PresentationReservationYouthMemberGQL();
      presenter.id = existing.youth_member_id;
      presenter.firstName = ym?.first_name || '';
      presenter.lastName = ym?.last_name || '';
      presenter.parentUserId = ym?.parent_user_id || '';
      res.youthMember = presenter;
    }

    return res;
  }

  // ── New Queries ──

  @Query(() => String, { nullable: true })
  async meetingsDriveFolderId(
    @Ctx() context: Context
  ): Promise<string | null> {
    this.requireAuth(context);
    return env.GOOGLE_DRIVE_MEETINGS_FOLDER_ID || null;
  }

  @Query(() => Boolean)
  async isCurrentUserPresentationManager(
    @Ctx() context: Context
  ): Promise<boolean> {
    const { userId } = this.requireAuth(context);
    return this.isManager(userId);
  }

  // ── Email Agenda ──

  @Mutation(() => Boolean)
  async emailAgenda(
    @Arg('input') input: EmailAgendaInput,
    @Ctx() context: Context
  ): Promise<boolean> {
    const userId = await this.requireManagerAccess(context);

    const meeting = await this.presRepo.findMeetingById(input.meetingId);
    if (!meeting) {
      throw new GraphQLError('Meeting not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (!meeting.agenda_drive_file_id) {
      throw new GraphQLError('No agenda linked to this meeting', {
        extensions: { code: 'BAD_INPUT' },
      });
    }

    const calEvent = await getCalendarEvent(meeting.google_event_id);
    const eventTitle = calEvent?.title || 'Club Meeting';
    const eventDate = calEvent?.startTime
      ? new Date(calEvent.startTime).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '';

    const agendaUrl = meeting.agenda_drive_file_url || `https://drive.google.com/file/d/${meeting.agenda_drive_file_id}/view`;

    const allUsers = await this.userRepo.findAll();
    const approvedMembers = allUsers.filter((u) => u.approval_status === 'APPROVED' && u.email);

    const subject = `Meeting Agenda: ${eventTitle}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2>Meeting Agenda</h2>
        <p><strong>${eventTitle}</strong>${eventDate ? ` — ${eventDate}` : ''}</p>
        ${input.message ? `<p>${input.message.replace(/\n/g, '<br>')}</p>` : ''}
        <p>
          <a href="${agendaUrl}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">
            View Agenda
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">
          — Bibber Creek Spurs 4-H Club
        </p>
      </div>
    `;

    let sentCount = 0;
    for (const member of approvedMembers) {
      try {
        await emailService.sendEmail({
          to: member.email,
          subject,
          html,
          userId,
          eventType: 'AGENDA_EMAIL',
          relatedResourceId: input.meetingId,
        });
        sentCount++;
      } catch (err: any) {
        logger.warn(`Failed to send agenda email to ${member.email}`, { error: err?.message });
      }
    }

    logger.info(`Agenda email sent to ${sentCount}/${approvedMembers.length} members for meeting ${input.meetingId}`);
    return true;
  }

  @Mutation(() => PresentationMeetingGQL)
  async createAgendaFromTemplate(
    @Arg('meetingId') meetingId: string,
    @Ctx() context: Context
  ): Promise<PresentationMeetingGQL> {
    await this.requireManagerAccess(context);

    const meeting = await this.presRepo.findMeetingById(meetingId);
    if (!meeting) {
      throw new GraphQLError('Meeting not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (meeting.agenda_drive_file_id) {
      throw new GraphQLError('This meeting already has an agenda linked. Remove it first to create a new one.', {
        extensions: { code: 'BAD_INPUT' },
      });
    }

    const templateId = env.GOOGLE_DRIVE_AGENDA_TEMPLATE_ID;
    if (!templateId) {
      throw new GraphQLError('Agenda template not configured', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }

    const meetingsFolderId = env.GOOGLE_DRIVE_MEETINGS_FOLDER_ID;
    if (!meetingsFolderId) {
      throw new GraphQLError('Meetings folder not configured', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }

    // Get calendar event for naming
    const calEvent = await getCalendarEvent(meeting.google_event_id);
    const eventTitle = calEvent?.title || 'Club Meeting';
    const eventDate = calEvent?.startTime
      ? new Date(calEvent.startTime).toISOString().split('T')[0]
      : 'Unknown Date';
    const agendaName = `Agenda - ${eventDate} - ${eventTitle}`;

    const copiedFile = await driveService.copyFile(templateId, agendaName, meetingsFolderId);
    if (!copiedFile) {
      throw new GraphQLError('Failed to create agenda from template', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }

    // Share so anyone with the link can view/edit (members don't need a specific Google account)
    await driveService.shareFilePublic(copiedFile.id);

    const agendaUrl = `https://docs.google.com/document/d/${copiedFile.id}/edit`;

    const updated = await this.presRepo.updateMeeting(meetingId, {
      agendaDriveFileId: copiedFile.id,
      agendaDriveFileName: copiedFile.name,
      agendaDriveFileUrl: agendaUrl,
    });

    const reservations = await this.presRepo.findReservationsByMeeting(updated!.id);

    const gql = new PresentationMeetingGQL();
    gql.id = updated!.id;
    gql.googleEventId = updated!.google_event_id;
    gql.totalSlots = updated!.total_slots;
    gql.notes = updated!.notes || undefined;
    gql.slotsRemaining = Math.max(0, updated!.total_slots - reservations.length);
    gql.eventTitle = calEvent?.title;
    gql.eventDate = calEvent?.startTime;
    gql.eventLocation = calEvent?.location;
    gql.agendaDriveFileId = updated!.agenda_drive_file_id || undefined;
    gql.agendaDriveFileName = updated!.agenda_drive_file_name || undefined;
    gql.agendaDriveFileUrl = updated!.agenda_drive_file_url || undefined;
    gql.minutesDriveFileId = updated!.minutes_drive_file_id || undefined;
    gql.minutesDriveFileName = updated!.minutes_drive_file_name || undefined;
    gql.minutesDriveFileUrl = updated!.minutes_drive_file_url || undefined;
    gql.reservations = await Promise.all(reservations.map((r) => this.mapReservation(r)));
    gql.createdAt = updated!.created_at.toISOString();

    logger.info(`Agenda created from template for meeting ${meetingId}: ${copiedFile.name} (${copiedFile.id})`);
    return gql;
  }

  @Mutation(() => PresentationMeetingGQL)
  async deleteAgenda(
    @Arg('meetingId') meetingId: string,
    @Ctx() context: Context
  ): Promise<PresentationMeetingGQL> {
    await this.requireManagerAccess(context);

    const meeting = await this.presRepo.findMeetingById(meetingId);
    if (!meeting) {
      throw new GraphQLError('Meeting not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (!meeting.agenda_drive_file_id) {
      throw new GraphQLError('No agenda linked to this meeting', {
        extensions: { code: 'BAD_INPUT' },
      });
    }

    // Delete from Google Drive (best-effort)
    try {
      const deleted = await driveService.deleteFile(meeting.agenda_drive_file_id);
      if (!deleted) {
        logger.warn(`Could not delete agenda Drive file: ${meeting.agenda_drive_file_id}`);
      }
    } catch (err: any) {
      logger.warn('Failed to delete agenda from Drive, unlinking anyway', {
        driveFileId: meeting.agenda_drive_file_id,
        error: err?.message,
      });
    }

    // Clear agenda fields in DB
    const updated = await this.presRepo.updateMeeting(meetingId, {
      agendaDriveFileId: null,
      agendaDriveFileName: null,
      agendaDriveFileUrl: null,
    });

    const reservations = await this.presRepo.findReservationsByMeeting(updated!.id);
    const calEvent = await getCalendarEvent(updated!.google_event_id);

    const gql = new PresentationMeetingGQL();
    gql.id = updated!.id;
    gql.googleEventId = updated!.google_event_id;
    gql.totalSlots = updated!.total_slots;
    gql.notes = updated!.notes || undefined;
    gql.slotsRemaining = Math.max(0, updated!.total_slots - reservations.length);
    gql.eventTitle = calEvent?.title;
    gql.eventDate = calEvent?.startTime;
    gql.eventLocation = calEvent?.location;
    gql.reservations = await Promise.all(reservations.map((r) => this.mapReservation(r)));
    gql.createdAt = updated!.created_at.toISOString();

    logger.info(`Agenda deleted for meeting ${meetingId}`);
    return gql;
  }

  @Mutation(() => Int, { description: 'Share all existing agenda files publicly (admin only). Returns count of files shared.' })
  async shareExistingAgendas(
    @Ctx() context: Context
  ): Promise<number> {
    await this.requireManagerAccess(context);

    const result = await db.query(
      `SELECT id, agenda_drive_file_id FROM presentation_meetings WHERE agenda_drive_file_id IS NOT NULL`
    );

    let shared = 0;
    for (const row of result.rows) {
      const ok = await driveService.shareFilePublic(row.agenda_drive_file_id);
      if (ok) shared++;
    }

    logger.info(`Shared ${shared}/${result.rows.length} existing agenda files publicly`);
    return shared;
  }

  @Mutation(() => String, { description: 'Grant the current user edit access to an agenda file. Returns the edit URL.' })
  async requestAgendaEditAccess(
    @Arg('meetingId') meetingId: string,
    @Ctx() context: Context
  ): Promise<string> {
    const userId = await this.requireManagerAccess(context);

    const meeting = await this.presRepo.findMeetingById(meetingId);
    if (!meeting) {
      throw new GraphQLError('Meeting not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (!meeting.agenda_drive_file_id) {
      throw new GraphQLError('No agenda linked to this meeting', {
        extensions: { code: 'BAD_INPUT' },
      });
    }

    const user = await this.userRepo.findById(userId);
    if (!user?.email) {
      throw new GraphQLError('Your account has no email address', {
        extensions: { code: 'BAD_INPUT' },
      });
    }

    const ok = await driveService.shareFileWithEmail(meeting.agenda_drive_file_id, user.email, 'writer');
    if (!ok) {
      throw new GraphQLError('Failed to grant edit access — your email may not be a Google account', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }

    const editUrl = `https://docs.google.com/document/d/${meeting.agenda_drive_file_id}/edit`;
    logger.info(`Granted edit access to agenda for meeting ${meetingId} to ${user.email}`);
    return editUrl;
  }
}
