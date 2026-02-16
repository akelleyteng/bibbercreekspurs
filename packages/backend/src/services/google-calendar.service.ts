import { env } from '../config/env';
import { logger } from '../utils/logger';

// Lazy-initialized calendar client — googleapis is loaded on first use
// to avoid ts-node processing its massive type definitions at startup
let calendarClient: any = null;

function getCalendarClient(): any {
  if (!env.GOOGLE_CALENDAR_ID) {
    return null;
  }

  if (!calendarClient) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { google } = require('googleapis');
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    calendarClient = google.calendar({ version: 'v3', auth });
  }

  return calendarClient;
}

const DAY_MAP: Record<string, string> = {
  Sun: 'SU', Mon: 'MO', Tue: 'TU', Wed: 'WE', Thu: 'TH', Fri: 'FR', Sat: 'SA',
};

function buildRRule(
  frequency: string,
  recurringEndDate: Date | null,
  daysOfWeek?: string[]
): string[] {
  let rule = `RRULE:FREQ=${frequency.toUpperCase()}`;

  if (frequency === 'weekly' && daysOfWeek?.length) {
    const byDay = daysOfWeek
      .map((d) => DAY_MAP[d])
      .filter(Boolean)
      .join(',');
    if (byDay) rule += `;BYDAY=${byDay}`;
  }

  if (recurringEndDate) {
    const until = recurringEndDate.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    rule += `;UNTIL=${until}`;
  }

  return [rule];
}

export interface CalendarEventParams {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  isRecurring?: boolean;
  recurringFrequency?: string;
  recurringEndDate?: Date | null;
  recurringDaysOfWeek?: string[];
}

/**
 * Create a Google Calendar event. Returns the calendar event ID or null on failure.
 */
export async function createCalendarEvent(params: CalendarEventParams): Promise<string | null> {
  const calendar = getCalendarClient();
  if (!calendar) return null;

  try {
    const eventBody: any = {
      summary: params.title,
      description: params.description,
      location: params.location,
      start: {
        dateTime: params.startTime.toISOString(),
        timeZone: 'America/Denver',
      },
      end: {
        dateTime: params.endTime.toISOString(),
        timeZone: 'America/Denver',
      },
    };

    if (params.isRecurring && params.recurringFrequency) {
      eventBody.recurrence = buildRRule(
        params.recurringFrequency,
        params.recurringEndDate || null,
        params.recurringDaysOfWeek
      );
    }

    const response = await calendar.events.insert({
      calendarId: env.GOOGLE_CALENDAR_ID,
      requestBody: eventBody,
    });

    const calendarEventId = response.data.id || null;
    logger.info(`Google Calendar event created: ${calendarEventId}`);
    return calendarEventId;
  } catch (error) {
    logger.error('Failed to create Google Calendar event', { error, title: params.title });
    return null;
  }
}

/**
 * Update a Google Calendar event. Returns true on success, false on failure.
 */
export async function updateCalendarEvent(
  googleCalendarId: string,
  params: Partial<CalendarEventParams>
): Promise<boolean> {
  const calendar = getCalendarClient();
  if (!calendar || !googleCalendarId) return false;

  try {
    const eventBody: any = {};

    if (params.title !== undefined) eventBody.summary = params.title;
    if (params.description !== undefined) eventBody.description = params.description;
    if (params.location !== undefined) eventBody.location = params.location;
    if (params.startTime !== undefined) {
      eventBody.start = {
        dateTime: params.startTime.toISOString(),
        timeZone: 'America/Denver',
      };
    }
    if (params.endTime !== undefined) {
      eventBody.end = {
        dateTime: params.endTime.toISOString(),
        timeZone: 'America/Denver',
      };
    }

    await calendar.events.patch({
      calendarId: env.GOOGLE_CALENDAR_ID,
      eventId: googleCalendarId,
      requestBody: eventBody,
    });

    logger.info(`Google Calendar event updated: ${googleCalendarId}`);
    return true;
  } catch (error) {
    logger.error('Failed to update Google Calendar event', { error, googleCalendarId });
    return false;
  }
}

/**
 * Delete a Google Calendar event. Returns true on success, false on failure.
 */
export async function deleteCalendarEvent(googleCalendarId: string): Promise<boolean> {
  const calendar = getCalendarClient();
  if (!calendar || !googleCalendarId) return false;

  try {
    await calendar.events.delete({
      calendarId: env.GOOGLE_CALENDAR_ID,
      eventId: googleCalendarId,
    });

    logger.info(`Google Calendar event deleted: ${googleCalendarId}`);
    return true;
  } catch (error) {
    logger.error('Failed to delete Google Calendar event', { error, googleCalendarId });
    return false;
  }
}
