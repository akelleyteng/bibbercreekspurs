import { Resolver, Query, Mutation, Arg, Ctx } from 'type-graphql';
import { EventGQL } from '../types/Event.type';
import { RsvpInput } from '../inputs/EventInput';
import { verifyAccessToken } from '../../services/auth.service';
import { EventRsvpRepository } from '../../repositories/event-rsvp.repository';
import { Context } from '../context';
import { GraphQLError } from 'graphql';
import { logger } from '../../utils/logger';
import {
  listCalendarEvents,
  getCalendarEvent,
  MappedCalendarEvent,
} from '../../services/google-calendar.service';

@Resolver()
export class EventResolver {
  private rsvpRepo: EventRsvpRepository;

  constructor() {
    this.rsvpRepo = new EventRsvpRepository();
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

    return Promise.all(filtered.map((e) => this.mapToGQL(e, auth?.userId)));
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

    return this.mapToGQL(calEvent, auth?.userId);
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
    return true;
  }
}
