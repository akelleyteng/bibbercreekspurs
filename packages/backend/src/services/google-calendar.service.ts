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

const DAY_INDEX_MAP: Record<number, string> = {
  0: 'SU', 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR', 6: 'SA',
};

function buildRRule(
  frequency: string,
  recurringEndDate: Date | null,
  startTime: Date,
  daysOfWeek?: string[],
  monthlyPattern?: string,
  interval?: number
): string[] {
  let rule = `RRULE:FREQ=${frequency.toUpperCase()}`;

  if (interval && interval > 1) {
    rule += `;INTERVAL=${interval}`;
  }

  if (frequency === 'weekly' && daysOfWeek?.length) {
    const byDay = daysOfWeek
      .map((d) => DAY_MAP[d])
      .filter(Boolean)
      .join(',');
    if (byDay) rule += `;BYDAY=${byDay}`;
  }

  if (frequency === 'monthly' && monthlyPattern === 'nth_weekday') {
    // e.g., 2nd Tuesday → BYDAY=2TU, 3rd Saturday → BYDAY=3SA
    const ordinal = Math.ceil(startTime.getDate() / 7);
    const weekdayCode = DAY_INDEX_MAP[startTime.getDay()];
    rule += `;BYDAY=${ordinal}${weekdayCode}`;
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
  monthlyPattern?: string;
  recurringInterval?: number;
  reminders?: Array<{ method: string; minutes: number }>;
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
        params.startTime,
        params.recurringDaysOfWeek,
        params.monthlyPattern,
        params.recurringInterval
      );
    }

    // Reminders
    if (params.reminders && params.reminders.length > 0) {
      eventBody.reminders = {
        useDefault: false,
        overrides: params.reminders.map((r) => ({
          method: r.method,
          minutes: r.minutes,
        })),
      };
    }

    const response = await calendar.events.insert({
      calendarId: env.GOOGLE_CALENDAR_ID,
      requestBody: eventBody,
      sendUpdates: 'all',
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

    if (params.reminders && params.reminders.length > 0) {
      eventBody.reminders = {
        useDefault: false,
        overrides: params.reminders.map((r) => ({
          method: r.method,
          minutes: r.minutes,
        })),
      };
    }

    await calendar.events.patch({
      calendarId: env.GOOGLE_CALENDAR_ID,
      eventId: googleCalendarId,
      requestBody: eventBody,
      sendUpdates: 'all',
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
      sendUpdates: 'all',
    });

    logger.info(`Google Calendar event deleted: ${googleCalendarId}`);
    return true;
  } catch (error) {
    logger.error('Failed to delete Google Calendar event', { error, googleCalendarId });
    return false;
  }
}

/**
 * Add an attendee to a Google Calendar event. Returns true on success.
 */
export async function addAttendeeToEvent(
  googleCalendarId: string,
  email: string,
  displayName?: string
): Promise<boolean> {
  const calendar = getCalendarClient();
  if (!calendar || !googleCalendarId) return false;

  try {
    // Fetch current event to get existing attendees
    const response = await calendar.events.get({
      calendarId: env.GOOGLE_CALENDAR_ID,
      eventId: googleCalendarId,
    });

    const existingAttendees: any[] = response.data.attendees || [];

    // Skip if already an attendee
    if (existingAttendees.some((a: any) => a.email === email)) {
      logger.info(`Attendee ${email} already on event ${googleCalendarId}`);
      return true;
    }

    const newAttendee: any = { email };
    if (displayName) newAttendee.displayName = displayName;

    await calendar.events.patch({
      calendarId: env.GOOGLE_CALENDAR_ID,
      eventId: googleCalendarId,
      requestBody: {
        attendees: [...existingAttendees, newAttendee],
      },
      sendUpdates: 'all',
    });

    logger.info(`Added attendee ${email} to Google Calendar event ${googleCalendarId}`);
    return true;
  } catch (error) {
    logger.error('Failed to add attendee to Google Calendar event', { error, googleCalendarId, email });
    return false;
  }
}

/**
 * Remove an attendee from a Google Calendar event. Returns true on success.
 */
export async function removeAttendeeFromEvent(
  googleCalendarId: string,
  email: string
): Promise<boolean> {
  const calendar = getCalendarClient();
  if (!calendar || !googleCalendarId) return false;

  try {
    const response = await calendar.events.get({
      calendarId: env.GOOGLE_CALENDAR_ID,
      eventId: googleCalendarId,
    });

    const existingAttendees: any[] = response.data.attendees || [];
    const filtered = existingAttendees.filter((a: any) => a.email !== email);

    // Nothing to remove
    if (filtered.length === existingAttendees.length) {
      return true;
    }

    await calendar.events.patch({
      calendarId: env.GOOGLE_CALENDAR_ID,
      eventId: googleCalendarId,
      requestBody: {
        attendees: filtered,
      },
      sendUpdates: 'all',
    });

    logger.info(`Removed attendee ${email} from Google Calendar event ${googleCalendarId}`);
    return true;
  } catch (error) {
    logger.error('Failed to remove attendee from Google Calendar event', { error, googleCalendarId, email });
    return false;
  }
}
