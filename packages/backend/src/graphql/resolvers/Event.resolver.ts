import { Resolver, Query, Mutation, Arg, Ctx } from 'type-graphql';
import { EventGQL, EventPresenterGQL } from '../types/Event.type';
import { PresentationRepository } from '../../repositories/presentation.repository';
import { RsvpInput } from '../inputs/EventInput';
import { verifyAccessToken } from '../../services/auth.service';
import { EventRsvpRepository } from '../../repositories/event-rsvp.repository';
import { Context } from '../context';
import { GraphQLError } from 'graphql';
import { logger } from '../../utils/logger';
import {
  listCalendarEvents,
  getCalendarEvent,
  addAttendeeToEvent,
  removeAttendeeFromEvent,
  MappedCalendarEvent,
} from '../../services/google-calendar.service';
import { UserRepository } from '../../repositories/user.repository';
import { NotificationRepository } from '../../repositories/notification.repository';
import db from '../../models/database';

@Resolver()
export class EventResolver {
  private rsvpRepo: EventRsvpRepository;
  private userRepo: UserRepository;
  private presRepo: PresentationRepository;
  private notifRepo: NotificationRepository;

  constructor() {
    this.rsvpRepo = new EventRsvpRepository();
    this.userRepo = new UserRepository();
    this.presRepo = new PresentationRepository();
    this.notifRepo = new NotificationRepository();
  }

  /**
   * Try to extract user info from auth token. Returns null if not authenticated.
   */
  private tryGetAuth(context: Context): { userId: string; email: string } | null {
    try {
      const authHeader = context.req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
      const token = authHeader.substring(7);
      const payload = verifyAccessToken(token);
      if (!payload.email) return null;
      return { userId: payload.userId, email: payload.email };
    } catch {
      return null;
    }
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

  private async mapToGQL(event: MappedCalendarEvent, userId?: string): Promise<EventGQL> {
    const gql = new EventGQL();
    gql.id = event.id;
    gql.title = event.title;
    gql.description = event.description;
    gql.startTime = event.startTime;
    gql.endTime = event.endTime;
    gql.location = event.location;
    gql.visibility = event.visibility;
    gql.externalRegistrationUrl = event.externalRegistrationUrl;
    gql.isAllDay = event.isAllDay;

    // Get registration count and user RSVP status from database
    gql.registrationCount = await this.rsvpRepo.countAttending(event.id);

    if (userId) {
      const rsvp = await this.rsvpRepo.findByEventAndUser(event.id, userId);
      gql.userRsvpStatus = rsvp?.status || undefined;
    }

    return gql;
  }

  @Query(() => [EventGQL])
  async events(
    @Arg('publicOnly', { nullable: true, defaultValue: false }) publicOnly: boolean,
    @Ctx() context: Context
  ): Promise<EventGQL[]> {
    const allEvents = await listCalendarEvents();
    const auth = this.tryGetAuth(context);

    const filtered = (publicOnly || !auth)
      ? allEvents.filter((e) => e.visibility === 'PUBLIC')
      : allEvents;

    // Check for new events and create notifications (fire-and-forget)
    this.checkForNewEventNotifications(allEvents)
      .catch(err => logger.warn('Event notification check failed', { error: err?.message }));

    return Promise.all(filtered.map((e) => this.mapToGQL(e, auth?.userId)));
  }

  private async checkForNewEventNotifications(events: MappedCalendarEvent[]): Promise<void> {
    if (events.length === 0) return;

    const eventIds = events.map(e => e.id);
    const result = await db.query<{ google_event_id: string }>(
      `SELECT google_event_id FROM notified_events WHERE google_event_id = ANY($1)`,
      [eventIds]
    );
    const alreadyNotified = new Set(result.rows.map(r => r.google_event_id));

    const newEvents = events.filter(e => !alreadyNotified.has(e.id));
    if (newEvents.length === 0) return;

    const allUsers = await this.userRepo.findAll();
    const activeUserIds = allUsers
      .filter(u => u.approval_status === 'APPROVED' && u.is_active !== false)
      .map(u => u.id);

    for (const event of newEvents) {
      if (activeUserIds.length > 0) {
        await this.notifRepo.createForMultipleUsers(activeUserIds, {
          type: 'NEW_EVENT',
          related_event_id: event.id,
          title: `${event.title} - click here to RSVP`,
        });
      }
      await db.query(
        `INSERT INTO notified_events (google_event_id) VALUES ($1) ON CONFLICT DO NOTHING`,
        [event.id]
      );
    }
  }

  @Query(() => EventGQL, { nullable: true })
  async event(
    @Arg('id') id: string,
    @Ctx() context: Context
  ): Promise<EventGQL | null> {
    const calEvent = await getCalendarEvent(id);
    if (!calEvent) return null;

    const auth = this.tryGetAuth(context);

    if (calEvent.visibility === 'MEMBER_ONLY' && !auth) {
      return null;
    }

    const gql = await this.mapToGQL(calEvent, auth?.userId);

    // Enrich with presentation meeting data (agenda + presenters)
    try {
      const meeting = await this.presRepo.findMeetingByEventId(calEvent.id);
      if (meeting) {
        gql.meetingId = meeting.id;
        gql.agendaUrl = meeting.agenda_drive_file_url || undefined;

        const reservations = await this.presRepo.findReservationsByMeeting(meeting.id);
        if (reservations.length > 0) {
          gql.presenters = reservations.map((r) => {
            const p = new EventPresenterGQL();
            p.userId = r.user_id;
            p.firstName = r.first_name;
            p.lastName = r.last_name;
            p.title = r.title;
            p.profilePhotoUrl = r.profile_photo_url || undefined;
            return p;
          });
        }
      }
    } catch (err: any) {
      logger.warn('Failed to enrich event with presentation data', { eventId: calEvent.id, error: err?.message });
    }

    return gql;
  }

  @Mutation(() => Boolean)
  async rsvpEvent(
    @Arg('input') input: RsvpInput,
    @Ctx() context: Context
  ): Promise<boolean> {
    const { userId } = this.requireAuth(context);

    const event = await getCalendarEvent(input.eventId);
    if (!event) {
      throw new GraphQLError('Event not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    try {
      await this.rsvpRepo.upsert(input.eventId, userId, input.status, input.guestCount);
    } catch (error: any) {
      logger.error('RSVP failed', { error, eventId: input.eventId, userId });
      throw new GraphQLError(`Failed to RSVP: ${error.message}`, {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }

    logger.info(`User ${userId} RSVP'd to event ${input.eventId} (status: ${input.status})`);

    // Sync attendee to Google Calendar (fire-and-forget — DB is source of truth)
    try {
      const user = await this.userRepo.findById(userId);
      if (user?.email) {
        if (input.status === 'ATTENDING' || input.status === 'ATTENDING_PLUS') {
          await addAttendeeToEvent(input.eventId, user.email);
        } else {
          await removeAttendeeFromEvent(input.eventId, user.email);
        }
      }
    } catch (calError: any) {
      logger.warn('Calendar attendee sync failed (RSVP still saved)', {
        eventId: input.eventId,
        userId,
        error: calError?.message,
      });
    }

    return true;
  }

  @Mutation(() => Boolean)
  async cancelRsvp(
    @Arg('eventId') eventId: string,
    @Ctx() context: Context
  ): Promise<boolean> {
    const { userId } = this.requireAuth(context);

    try {
      await this.rsvpRepo.delete(eventId, userId);
    } catch (error: any) {
      logger.error('Cancel RSVP failed', { error, eventId, userId });
      throw new GraphQLError(`Failed to cancel RSVP: ${error.message}`, {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }

    logger.info(`User ${userId} cancelled RSVP for event ${eventId}`);

    // Remove attendee from Google Calendar (fire-and-forget)
    try {
      const user = await this.userRepo.findById(userId);
      if (user?.email) {
        await removeAttendeeFromEvent(eventId, user.email);
      }
    } catch (calError: any) {
      logger.warn('Calendar attendee removal failed (RSVP still cancelled)', {
        eventId,
        userId,
        error: calError?.message,
      });
    }

    return true;
  }
}
