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

// ── In-Memory Cache ──────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const eventsListCache = new Map<string, CacheEntry<MappedCalendarEvent[]>>();
const eventCache = new Map<string, CacheEntry<MappedCalendarEvent>>();

function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function invalidateEventCache(eventId?: string): void {
  eventsListCache.clear();
  if (eventId) {
    eventCache.delete(eventId);
  } else {
    eventCache.clear();
  }
}

// ── Description Tag Parsing ──────────────────────────────────────────

interface ParsedDescription {
  description: string;
  isPublic: boolean;
  externalRegistrationUrl?: string;
}

export function parseEventDescription(raw: string | null | undefined): ParsedDescription {
  if (!raw) return { description: '', isPublic: false };

  let text = raw;
  let isPublic = false;
  let externalRegistrationUrl: string | undefined;

  // [PUBLIC] - case insensitive
  if (/\[PUBLIC\]/i.test(text)) {
    isPublic = true;
    text = text.replace(/\[PUBLIC\]/gi, '');
  }

  // [REGISTER: url]
  const registerMatch = /\[REGISTER:\s*(https?:\/\/[^\]\s]+)\s*\]/i.exec(text);
  if (registerMatch) {
    externalRegistrationUrl = registerMatch[1];
    text = text.replace(/\[REGISTER:\s*https?:\/\/[^\]\s]+\s*\]/gi, '');
  }

  return {
    description: text.trim(),
    isPublic,
    externalRegistrationUrl,
  };
}

// ── Mapped Event Type ────────────────────────────────────────────────

export interface MappedCalendarEvent {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location?: string;
  isAllDay: boolean;
  visibility: 'PUBLIC' | 'MEMBER_ONLY';
  externalRegistrationUrl?: string;
  registrationCount: number;
  attendees: Array<{ email: string; displayName?: string; responseStatus?: string }>;
}

function mapGoogleEvent(event: any): MappedCalendarEvent {
  const parsed = parseEventDescription(event.description);

  // Filter out resource rooms and the calendar itself from attendee count
  const attendees = (event.attendees || []).filter(
    (a: any) => !a.resource && !a.self
  );

  return {
    id: event.id,
    title: event.summary || '(No Title)',
    description: parsed.description,
    startTime: event.start?.dateTime || event.start?.date || '',
    endTime: event.end?.dateTime || event.end?.date || '',
    location: event.location || undefined,
    isAllDay: !event.start?.dateTime,
    visibility: parsed.isPublic ? 'PUBLIC' : 'MEMBER_ONLY',
    externalRegistrationUrl: parsed.externalRegistrationUrl,
    registrationCount: attendees.length,
    attendees,
  };
}

// ── API Functions ────────────────────────────────────────────────────

/**
 * List upcoming events from Google Calendar.
 * Uses singleEvents: true to expand recurring events into individual instances.
 */
export async function listCalendarEvents(): Promise<MappedCalendarEvent[]> {
  const cacheKey = 'upcoming';
  const cached = getCached(eventsListCache, cacheKey);
  if (cached) return cached;

  const calendar = getCalendarClient();
  if (!calendar) return [];

  try {
    const response = await calendar.events.list({
      calendarId: env.GOOGLE_CALENDAR_ID,
      timeMin: new Date().toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
    });

    const events = (response.data.items || []).map(mapGoogleEvent);
    setCache(eventsListCache, cacheKey, events);
    return events;
  } catch (error) {
    logger.error('Failed to list Google Calendar events', { error });
    return [];
  }
}

/**
 * Get a single event by ID from Google Calendar.
 */
export async function getCalendarEvent(eventId: string): Promise<MappedCalendarEvent | null> {
  const cached = getCached(eventCache, eventId);
  if (cached) return cached;

  const calendar = getCalendarClient();
  if (!calendar) return null;

  try {
    const response = await calendar.events.get({
      calendarId: env.GOOGLE_CALENDAR_ID,
      eventId,
    });

    const mapped = mapGoogleEvent(response.data);
    setCache(eventCache, eventId, mapped);
    return mapped;
  } catch (error) {
    logger.error('Failed to get Google Calendar event', { error, eventId });
    return null;
  }
}

/**
 * Add an attendee to a Google Calendar event. Returns true on success.
 */
export async function addAttendeeToEvent(
  googleCalendarId: string,
  email: string,
  displayName?: string,
  sendUpdates: 'all' | 'none' = 'none'
): Promise<boolean> {
  const calendar = getCalendarClient();
  if (!calendar || !googleCalendarId) return false;

  try {
    const response = await calendar.events.get({
      calendarId: env.GOOGLE_CALENDAR_ID,
      eventId: googleCalendarId,
    });

    const existingAttendees: any[] = response.data.attendees || [];

    if (existingAttendees.some((a: any) => a.email.toLowerCase() === email.toLowerCase())) {
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
      sendUpdates,
    });

    invalidateEventCache(googleCalendarId);
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
  email: string,
  sendUpdates: 'all' | 'none' = 'all'
): Promise<boolean> {
  const calendar = getCalendarClient();
  if (!calendar || !googleCalendarId) return false;

  try {
    const response = await calendar.events.get({
      calendarId: env.GOOGLE_CALENDAR_ID,
      eventId: googleCalendarId,
    });

    const existingAttendees: any[] = response.data.attendees || [];
    const filtered = existingAttendees.filter(
      (a: any) => a.email.toLowerCase() !== email.toLowerCase()
    );

    if (filtered.length === existingAttendees.length) {
      return true;
    }

    await calendar.events.patch({
      calendarId: env.GOOGLE_CALENDAR_ID,
      eventId: googleCalendarId,
      requestBody: {
        attendees: filtered,
      },
      sendUpdates,
    });

    invalidateEventCache(googleCalendarId);
    logger.info(`Removed attendee ${email} from Google Calendar event ${googleCalendarId}`);
    return true;
  } catch (error) {
    logger.error('Failed to remove attendee from Google Calendar event', { error, googleCalendarId, email });
    return false;
  }
}
