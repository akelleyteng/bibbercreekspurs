import { Resolver, Query, Mutation, Arg, Ctx } from 'type-graphql';
import { EventGQL, EventCreator } from '../types/Event.type';
import { CreateEventInput, UpdateEventInput } from '../inputs/EventInput';
import { EventRepository, EventRow } from '../../repositories/event.repository';
import { UserRepository } from '../../repositories/user.repository';
import { verifyAccessToken } from '../../services/auth.service';
import { Role } from '@4hclub/shared';
import { Context } from '../context';
import { GraphQLError } from 'graphql';
import { logger } from '../../utils/logger';

@Resolver()
export class EventResolver {
  private eventRepo: EventRepository;
  private userRepo: UserRepository;

  constructor() {
    this.eventRepo = new EventRepository();
    this.userRepo = new UserRepository();
  }

  private mapRow(row: EventRow): EventGQL {
    const creator: EventCreator = {
      id: row.creator_id,
      firstName: row.creator_first_name,
      lastName: row.creator_last_name,
      profileImageUrl: row.creator_profile_image_url,
    };

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      startTime: row.start_time,
      endTime: row.end_time,
      location: row.location,
      visibility: row.visibility,
      eventType: row.event_type,
      externalRegistrationUrl: row.external_registration_url,
      imageUrl: row.image_url,
      registrationCount: row.registration_count,
      creator,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private async requireAdmin(context: Context): Promise<string> {
    const authHeader = context.req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    const user = await this.userRepo.findById(payload.userId);

    if (!user || user.role !== Role.ADMIN) {
      throw new GraphQLError('Admin access required', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    return payload.userId;
  }

  private requireAuth(context: Context): string {
    const authHeader = context.req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    return payload.userId;
  }

  @Query(() => [EventGQL])
  async events(
    @Arg('publicOnly', { nullable: true, defaultValue: false }) publicOnly: boolean
  ): Promise<EventGQL[]> {
    const rows = publicOnly
      ? await this.eventRepo.findPublicUpcoming()
      : await this.eventRepo.findAll();
    return rows.map((row) => this.mapRow(row));
  }

  @Query(() => EventGQL, { nullable: true })
  async event(
    @Arg('id') id: string,
    @Ctx() context: Context
  ): Promise<EventGQL | null> {
    const row = await this.eventRepo.findById(id);
    if (!row) return null;

    const event = this.mapRow(row);

    // Check if the current user has RSVP'd
    try {
      const userId = this.requireAuth(context);
      const status = await this.eventRepo.getUserRegistrationStatus(id, userId);
      if (status) {
        event.userRegistrationStatus = status;
      }
    } catch {
      // Not authenticated — that's fine for public events
    }

    return event;
  }

  @Mutation(() => EventGQL)
  async createEvent(
    @Arg('input') input: CreateEventInput,
    @Ctx() context: Context
  ): Promise<EventGQL> {
    const userId = await this.requireAdmin(context);

    const row = await this.eventRepo.create({
      title: input.title,
      description: input.description,
      start_time: new Date(input.startTime),
      end_time: new Date(input.endTime),
      location: input.location,
      visibility: input.visibility,
      event_type: input.eventType,
      external_registration_url: input.externalRegistrationUrl,
      image_url: input.imageUrl,
      created_by: userId,
    });

    return this.mapRow(row);
  }

  @Mutation(() => EventGQL)
  async updateEvent(
    @Arg('id') id: string,
    @Arg('input') input: UpdateEventInput,
    @Ctx() context: Context
  ): Promise<EventGQL> {
    await this.requireAdmin(context);

    const data: Record<string, any> = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.startTime !== undefined) data.start_time = new Date(input.startTime);
    if (input.endTime !== undefined) data.end_time = new Date(input.endTime);
    if (input.location !== undefined) data.location = input.location;
    if (input.visibility !== undefined) data.visibility = input.visibility;
    if (input.eventType !== undefined) data.event_type = input.eventType;
    if (input.externalRegistrationUrl !== undefined) data.external_registration_url = input.externalRegistrationUrl;
    if (input.imageUrl !== undefined) data.image_url = input.imageUrl;

    const row = await this.eventRepo.update(id, data);

    if (!row) {
      throw new GraphQLError('Event not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return this.mapRow(row);
  }

  @Mutation(() => Boolean)
  async deleteEvent(
    @Arg('id') id: string,
    @Ctx() context: Context
  ): Promise<boolean> {
    await this.requireAdmin(context);

    const deleted = await this.eventRepo.softDelete(id);

    if (!deleted) {
      throw new GraphQLError('Event not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return true;
  }

  @Mutation(() => Boolean)
  async rsvpEvent(
    @Arg('eventId') eventId: string,
    @Ctx() context: Context
  ): Promise<boolean> {
    const userId = this.requireAuth(context);

    const event = await this.eventRepo.findById(eventId);
    if (!event) {
      throw new GraphQLError('Event not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (event.event_type !== 'internal') {
      throw new GraphQLError('Cannot RSVP to external events — use the external registration link', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }

    await this.eventRepo.addRegistration(eventId, userId);
    return true;
  }

  @Mutation(() => Boolean)
  async cancelRsvp(
    @Arg('eventId') eventId: string,
    @Ctx() context: Context
  ): Promise<boolean> {
    const userId = this.requireAuth(context);

    const cancelled = await this.eventRepo.cancelRegistration(eventId, userId);

    if (!cancelled) {
      throw new GraphQLError('No registration found to cancel', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return true;
  }
}
