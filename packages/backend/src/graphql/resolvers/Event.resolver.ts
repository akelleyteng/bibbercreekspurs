import { Resolver, Query, Mutation, Arg, Ctx } from 'type-graphql';
import { EventGQL, EventCreator } from '../types/Event.type';
import { CreateEventInput, UpdateEventInput } from '../inputs/EventInput';
import { EventRepository, EventRow, CreateEventData } from '../../repositories/event.repository';
import { UserRepository } from '../../repositories/user.repository';
import { verifyAccessToken } from '../../services/auth.service';
import { Role } from '@4hclub/shared';
import { Context } from '../context';
import { GraphQLError } from 'graphql';
import { logger } from '../../utils/logger';
import crypto from 'crypto';
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  addAttendeeToEvent,
  removeAttendeeFromEvent,
  CalendarEventParams,
} from '../../services/google-calendar.service';

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
      seriesId: row.series_id,
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

  private static readonly MAX_RECURRENCE_MONTHS = 6;
  private static readonly MAX_OCCURRENCES = 365;
  private static readonly DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  /**
   * Find the nth occurrence of a weekday in a given month.
   * Returns null if the nth occurrence doesn't exist (e.g., 5th Monday).
   */
  private static getNthWeekdayOfMonth(
    year: number, month: number, weekday: number, ordinal: number,
    hours: number, minutes: number, seconds: number
  ): Date | null {
    const firstOfMonth = new Date(year, month, 1);
    const firstWeekdayOffset = (weekday - firstOfMonth.getDay() + 7) % 7;
    const day = 1 + firstWeekdayOffset + (ordinal - 1) * 7;
    const result = new Date(year, month, day, hours, minutes, seconds, 0);
    if (result.getMonth() !== month) return null;
    return result;
  }

  private generateOccurrences(
    startTime: Date,
    endTime: Date,
    frequency: string,
    recurringEndDate: Date,
    daysOfWeek?: string[],
    monthlyPattern?: string,
    interval: number = 1
  ): Array<{ start: Date; end: Date }> {
    const duration = endTime.getTime() - startTime.getTime();
    const occurrences: Array<{ start: Date; end: Date }> = [];
    const step = Math.max(1, interval);

    if (frequency === 'weekly') {
      const targetDays = daysOfWeek?.length
        ? daysOfWeek.map((d) => EventResolver.DAY_NAMES.indexOf(d)).filter((i) => i >= 0)
        : [startTime.getDay()];

      // Start from the beginning of the start week
      const current = new Date(startTime);
      current.setDate(current.getDate() - current.getDay()); // Go to Sunday of start week

      while (current <= recurringEndDate && occurrences.length < EventResolver.MAX_OCCURRENCES) {
        for (const dayIndex of targetDays) {
          const candidate = new Date(current);
          candidate.setDate(current.getDate() + dayIndex);
          candidate.setHours(startTime.getHours(), startTime.getMinutes(), startTime.getSeconds(), 0);

          if (candidate >= startTime && candidate <= recurringEndDate && occurrences.length < EventResolver.MAX_OCCURRENCES) {
            occurrences.push({
              start: new Date(candidate),
              end: new Date(candidate.getTime() + duration),
            });
          }
        }
        // Advance by N weeks
        current.setDate(current.getDate() + 7 * step);
      }
    } else if (frequency === 'daily') {
      const current = new Date(startTime);
      while (current <= recurringEndDate && occurrences.length < EventResolver.MAX_OCCURRENCES) {
        occurrences.push({
          start: new Date(current),
          end: new Date(current.getTime() + duration),
        });
        current.setDate(current.getDate() + step);
      }
    } else if (frequency === 'monthly') {
      if (monthlyPattern === 'nth_weekday') {
        // "2nd Tuesday", "3rd Saturday", etc. — derived from startTime
        const targetWeekday = startTime.getDay();
        const targetOrdinal = Math.ceil(startTime.getDate() / 7);
        let year = startTime.getFullYear();
        let month = startTime.getMonth();

        while (occurrences.length < EventResolver.MAX_OCCURRENCES) {
          const candidate = EventResolver.getNthWeekdayOfMonth(
            year, month, targetWeekday, targetOrdinal,
            startTime.getHours(), startTime.getMinutes(), startTime.getSeconds()
          );

          if (candidate && candidate >= startTime && candidate <= recurringEndDate) {
            occurrences.push({
              start: new Date(candidate),
              end: new Date(candidate.getTime() + duration),
            });
          }

          // Advance by N months
          month += step;
          while (month > 11) { month -= 12; year++; }

          // Stop if we've passed the end date
          if (new Date(year, month, 1) > recurringEndDate) break;
        }
      } else {
        // Default: same day of month (day_of_month)
        const targetDay = startTime.getDate();
        const current = new Date(startTime);
        while (current <= recurringEndDate && occurrences.length < EventResolver.MAX_OCCURRENCES) {
          occurrences.push({
            start: new Date(current),
            end: new Date(current.getTime() + duration),
          });
          current.setMonth(current.getMonth() + step);
          const lastDayOfMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
          current.setDate(Math.min(targetDay, lastDayOfMonth));
        }
      }
    }

    return occurrences;
  }

  @Mutation(() => EventGQL)
  async createEvent(
    @Arg('input') input: CreateEventInput,
    @Ctx() context: Context
  ): Promise<EventGQL> {
    const userId = await this.requireAdmin(context);

    const baseData = {
      title: input.title,
      description: input.description,
      location: input.location,
      visibility: input.visibility,
      event_type: input.eventType,
      external_registration_url: input.externalRegistrationUrl,
      image_url: input.imageUrl,
      created_by: userId,
    };

    if (input.isRecurring && input.recurringFrequency) {
      const startTime = new Date(input.startTime);
      const endTime = new Date(input.endTime);

      let recurringEndDate: Date;
      if (input.recurringEndDate) {
        recurringEndDate = new Date(input.recurringEndDate);
        // Set to end of day so the last day is included
        recurringEndDate.setHours(23, 59, 59, 999);
      } else {
        recurringEndDate = new Date(startTime);
        recurringEndDate.setMonth(recurringEndDate.getMonth() + EventResolver.MAX_RECURRENCE_MONTHS);
      }

      const occurrences = this.generateOccurrences(
        startTime, endTime, input.recurringFrequency, recurringEndDate,
        input.recurringDaysOfWeek, input.monthlyPattern, input.recurringInterval
      );

      if (occurrences.length === 0) {
        throw new GraphQLError('No event occurrences could be generated with the given recurrence settings', {
          extensions: { code: 'BAD_REQUEST' },
        });
      }

      const seriesId = crypto.randomUUID();
      const dataArray: CreateEventData[] = occurrences.map((occ) => ({
        ...baseData,
        start_time: occ.start,
        end_time: occ.end,
        series_id: seriesId,
      }));

      const rows = await this.eventRepo.createBatch(dataArray);
      logger.info(`Created recurring event series ${seriesId} with ${rows.length} occurrences`);

      // Google Calendar sync: create ONE recurring event with RRULE
      if (input.publishToGoogleCalendar) {
        this.syncCreateCalendarEvent({
          title: input.title,
          description: input.description,
          startTime,
          endTime,
          location: input.location,
          isRecurring: true,
          recurringFrequency: input.recurringFrequency,
          recurringEndDate,
          recurringDaysOfWeek: input.recurringDaysOfWeek,
          monthlyPattern: input.monthlyPattern,
          recurringInterval: input.recurringInterval,
          reminders: this.buildReminders(input.reminderMethods, input.reminderMinutesBefore),
        }, undefined, seriesId).catch(() => {});
      }

      return this.mapRow(rows[0]);
    }

    // Non-recurring: single event
    const row = await this.eventRepo.create({
      ...baseData,
      start_time: new Date(input.startTime),
      end_time: new Date(input.endTime),
    });

    // Google Calendar sync
    if (input.publishToGoogleCalendar) {
      this.syncCreateCalendarEvent({
        title: input.title,
        description: input.description,
        startTime: new Date(input.startTime),
        endTime: new Date(input.endTime),
        location: input.location,
        reminders: this.buildReminders(input.reminderMethods, input.reminderMinutesBefore),
      }, row.id).catch(() => {});
    }

    return this.mapRow(row);
  }

  private buildReminders(
    methods?: string[],
    minutesBefore?: number[]
  ): Array<{ method: string; minutes: number }> | undefined {
    if (!methods?.length || !minutesBefore?.length) return undefined;
    const reminders: Array<{ method: string; minutes: number }> = [];
    for (let i = 0; i < Math.min(methods.length, minutesBefore.length, 5); i++) {
      reminders.push({ method: methods[i], minutes: minutesBefore[i] });
    }
    return reminders.length > 0 ? reminders : undefined;
  }

  private async syncCreateCalendarEvent(
    params: CalendarEventParams,
    eventId?: string,
    seriesId?: string
  ): Promise<void> {
    const googleCalendarId = await createCalendarEvent(params);
    if (googleCalendarId) {
      if (seriesId) {
        await this.eventRepo.updateGoogleCalendarIdBySeriesId(seriesId, googleCalendarId);
      } else if (eventId) {
        await this.eventRepo.updateGoogleCalendarId(eventId, googleCalendarId);
      }
    }
  }

  @Mutation(() => EventGQL)
  async updateEvent(
    @Arg('id') id: string,
    @Arg('input') input: UpdateEventInput,
    @Ctx() context: Context
  ): Promise<EventGQL> {
    const userId = await this.requireAdmin(context);

    // Check if we're converting a non-recurring event to recurring
    if (input.isRecurring && input.recurringFrequency) {
      const existing = await this.eventRepo.findById(id);
      if (!existing) {
        throw new GraphQLError('Event not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // Only convert if event isn't already part of a series
      if (!existing.series_id) {
        const startTime = input.startTime ? new Date(input.startTime) : existing.start_time;
        const endTime = input.endTime ? new Date(input.endTime) : existing.end_time;

        let recurringEndDate: Date;
        if (input.recurringEndDate) {
          recurringEndDate = new Date(input.recurringEndDate);
          recurringEndDate.setHours(23, 59, 59, 999);
        } else {
          recurringEndDate = new Date(startTime);
          recurringEndDate.setMonth(recurringEndDate.getMonth() + EventResolver.MAX_RECURRENCE_MONTHS);
        }

        const occurrences = this.generateOccurrences(
          startTime, endTime, input.recurringFrequency, recurringEndDate,
          input.recurringDaysOfWeek, input.monthlyPattern, input.recurringInterval
        );

        if (occurrences.length === 0) {
          throw new GraphQLError('No event occurrences could be generated with the given recurrence settings', {
            extensions: { code: 'BAD_REQUEST' },
          });
        }

        const seriesId = crypto.randomUUID();

        // Update the original event with new fields + series_id
        const updateData: Record<string, any> = { series_id: seriesId };
        if (input.title !== undefined) updateData.title = input.title;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.startTime !== undefined) updateData.start_time = new Date(input.startTime);
        if (input.endTime !== undefined) updateData.end_time = new Date(input.endTime);
        if (input.location !== undefined) updateData.location = input.location;
        if (input.visibility !== undefined) updateData.visibility = input.visibility;
        if (input.eventType !== undefined) updateData.event_type = input.eventType;
        if (input.externalRegistrationUrl !== undefined) updateData.external_registration_url = input.externalRegistrationUrl;
        if (input.imageUrl !== undefined) updateData.image_url = input.imageUrl;

        const updatedRow = await this.eventRepo.update(id, updateData);
        if (!updatedRow) {
          throw new GraphQLError('Event not found', {
            extensions: { code: 'NOT_FOUND' },
          });
        }

        // Create additional occurrences (skip the first one — that's the original event)
        const additionalOccurrences = occurrences.slice(1);
        if (additionalOccurrences.length > 0) {
          const baseData = {
            title: input.title ?? existing.title,
            description: input.description ?? existing.description,
            location: input.location ?? existing.location,
            visibility: input.visibility ?? existing.visibility,
            event_type: input.eventType ?? existing.event_type,
            external_registration_url: input.externalRegistrationUrl ?? existing.external_registration_url,
            image_url: input.imageUrl ?? existing.image_url,
            created_by: userId,
          };

          const dataArray: CreateEventData[] = additionalOccurrences.map((occ) => ({
            ...baseData,
            start_time: occ.start,
            end_time: occ.end,
            series_id: seriesId,
          }));

          await this.eventRepo.createBatch(dataArray);
        }

        logger.info(`Converted event ${id} to recurring series ${seriesId} with ${occurrences.length} total occurrences`);

        // Google Calendar sync
        if (input.publishToGoogleCalendar) {
          this.syncCreateCalendarEvent({
            title: input.title ?? existing.title,
            description: input.description ?? existing.description,
            startTime,
            endTime,
            location: input.location ?? existing.location,
            isRecurring: true,
            recurringFrequency: input.recurringFrequency,
            recurringEndDate,
            recurringDaysOfWeek: input.recurringDaysOfWeek,
            monthlyPattern: input.monthlyPattern,
            recurringInterval: input.recurringInterval,
            reminders: this.buildReminders(input.reminderMethods, input.reminderMinutesBefore),
          }, undefined, seriesId).catch(() => {});
        }

        return this.mapRow(updatedRow);
      }
    }

    // Standard field update (non-recurring or already-recurring event)
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

    // Google Calendar sync
    if (row.google_calendar_id) {
      // Update existing Google Calendar event
      const updateParams: Partial<CalendarEventParams> = {};
      if (input.title !== undefined) updateParams.title = input.title;
      if (input.description !== undefined) updateParams.description = input.description;
      if (input.location !== undefined) updateParams.location = input.location;
      if (input.startTime !== undefined) updateParams.startTime = new Date(input.startTime);
      if (input.endTime !== undefined) updateParams.endTime = new Date(input.endTime);
      const reminders = this.buildReminders(input.reminderMethods, input.reminderMinutesBefore);
      if (reminders) updateParams.reminders = reminders;
      updateCalendarEvent(row.google_calendar_id, updateParams).catch(() => {});
    } else if (input.publishToGoogleCalendar) {
      // No Google Calendar event yet — create one and tie them together
      this.syncCreateCalendarEvent({
        title: row.title,
        description: row.description,
        startTime: row.start_time,
        endTime: row.end_time,
        location: row.location,
        reminders: this.buildReminders(input.reminderMethods, input.reminderMinutesBefore),
      }, row.id, row.series_id || undefined).catch(() => {});
    }

    return this.mapRow(row);
  }

  @Mutation(() => Boolean)
  async deleteEvent(
    @Arg('id') id: string,
    @Ctx() context: Context
  ): Promise<boolean> {
    await this.requireAdmin(context);

    // Fetch event before deleting to get google_calendar_id and series_id
    const event = await this.eventRepo.findById(id);
    if (!event) {
      throw new GraphQLError('Event not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const deleted = await this.eventRepo.softDelete(id);

    if (!deleted) {
      throw new GraphQLError('Event not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Google Calendar sync
    if (event.google_calendar_id) {
      if (event.series_id) {
        // Deleting one occurrence of a series — skip calendar deletion
        logger.info(`Skipping Google Calendar delete for series occurrence ${id} (series ${event.series_id})`);
      } else {
        deleteCalendarEvent(event.google_calendar_id).catch(() => {});
      }
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

    // Add attendee to Google Calendar event (fire-and-forget, member-only events only)
    if (event.google_calendar_id && event.visibility === 'MEMBER_ONLY') {
      const user = await this.userRepo.findById(userId);
      if (user) {
        addAttendeeToEvent(
          event.google_calendar_id,
          user.email,
          `${user.first_name} ${user.last_name}`
        ).catch(() => {});
      }
    }

    return true;
  }

  @Mutation(() => Boolean)
  async cancelRsvp(
    @Arg('eventId') eventId: string,
    @Ctx() context: Context
  ): Promise<boolean> {
    const userId = this.requireAuth(context);

    const event = await this.eventRepo.findById(eventId);
    const cancelled = await this.eventRepo.cancelRegistration(eventId, userId);

    if (!cancelled) {
      throw new GraphQLError('No registration found to cancel', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Remove attendee from Google Calendar event (fire-and-forget, member-only events only)
    if (event?.google_calendar_id && event.visibility === 'MEMBER_ONLY') {
      const user = await this.userRepo.findById(userId);
      if (user) {
        removeAttendeeFromEvent(event.google_calendar_id, user.email).catch(() => {});
      }
    }

    return true;
  }
}
