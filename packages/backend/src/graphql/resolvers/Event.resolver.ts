import { Resolver, Query, Mutation, Arg, Ctx } from 'type-graphql';
import { EventGQL } from '../types/Event.type';
import { RsvpInput } from '../inputs/EventInput';
import { UserRepository } from '../../repositories/user.repository';
import { verifyAccessToken } from '../../services/auth.service';
import { Context } from '../context';
import { GraphQLError } from 'graphql';
import { logger } from '../../utils/logger';
import {
  listCalendarEvents,
  getCalendarEvent,
  addAttendeeToEvent,
  removeAttendeeFromEvent,
  invalidateEventCache,
  MappedCalendarEvent,
} from '../../services/google-calendar.service';

@Resolver()
export class EventResolver {
  private userRepo: UserRepository;

  constructor() {
    this.userRepo = new UserRepository();
  }

  /**
   * Try to extract user email from auth token. Returns null if not authenticated.
   */
  private tryGetUserEmail(context: Context): { userId: string; email: string } | null {
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

  private requireAuthEmail(context: Context): { userId: string; email: string } {
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

  private mapToGQL(event: MappedCalendarEvent, userEmail?: string | null): EventGQL {
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
    gql.registrationCount = event.registrationCount;

    if (userEmail) {
      const attendee = event.attendees.find(
        (a) => a.email.toLowerCase() === userEmail.toLowerCase()
      );
      gql.userRsvpStatus = attendee?.responseStatus || undefined;
    }

    return gql;
  }

  @Query(() => [EventGQL])
  async events(
    @Arg('publicOnly', { nullable: true, defaultValue: false }) publicOnly: boolean,
    @Ctx() context: Context
  ): Promise<EventGQL[]> {
    const allEvents = await listCalendarEvents();
    const auth = this.tryGetUserEmail(context);

    if (publicOnly || !auth) {
      return allEvents
        .filter((e) => e.visibility === 'PUBLIC')
        .map((e) => this.mapToGQL(e, auth?.email));
    }

    return allEvents.map((e) => this.mapToGQL(e, auth.email));
  }

  @Query(() => EventGQL, { nullable: true })
  async event(
    @Arg('id') id: string,
    @Ctx() context: Context
  ): Promise<EventGQL | null> {
    const calEvent = await getCalendarEvent(id);
    if (!calEvent) return null;

    const auth = this.tryGetUserEmail(context);

    // MEMBER_ONLY events require authentication
    if (calEvent.visibility === 'MEMBER_ONLY' && !auth) {
      return null;
    }

    return this.mapToGQL(calEvent, auth?.email);
  }

  @Mutation(() => Boolean)
  async rsvpEvent(
    @Arg('input') input: RsvpInput,
    @Ctx() context: Context
  ): Promise<boolean> {
    const { userId, email } = this.requireAuthEmail(context);

    const event = await getCalendarEvent(input.eventId);
    if (!event) {
      throw new GraphQLError('Event not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Look up user display name for attendee
    const user = await this.userRepo.findById(userId);
    const displayName = user
      ? `${user.first_name} ${user.last_name}`
      : undefined;

    const sendUpdates = input.addToCalendar ? 'all' : 'none';

    const success = await addAttendeeToEvent(
      input.eventId,
      email,
      displayName,
      sendUpdates as 'all' | 'none'
    );

    if (!success) {
      throw new GraphQLError('Failed to RSVP', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }

    invalidateEventCache(input.eventId);
    logger.info(`User ${userId} RSVP'd to event ${input.eventId} (addToCalendar: ${input.addToCalendar})`);
    return true;
  }

  @Mutation(() => Boolean)
  async cancelRsvp(
    @Arg('eventId') eventId: string,
    @Ctx() context: Context
  ): Promise<boolean> {
    const { userId, email } = this.requireAuthEmail(context);

    const success = await removeAttendeeFromEvent(eventId, email, 'all');

    if (!success) {
      throw new GraphQLError('Failed to cancel RSVP', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }

    invalidateEventCache(eventId);
    logger.info(`User ${userId} cancelled RSVP for event ${eventId}`);
    return true;
  }
}
