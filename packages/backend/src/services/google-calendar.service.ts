import { env } from '../config/env';
import { logger } from '../utils/logger';

// Lazy-initialized calendar clients — googleapis is loaded on first use
// to avoid ts-node processing its massive type definitions at startup.
//
// Two clients:
// 1. Service account client — for reads (listing, getting events)
// 2. OAuth2 client — for writes (adding/removing attendees).
//    Service accounts can't add attendees without Domain-Wide Delegation.
//    Uses the calendar owner's OAuth2 refresh token instead.
let calendarClient: any = null;
let calendarWriteClient: any = null;

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

/**
 * Get an OAuth2-authenticated Calendar client for writes (attendee management).
 * Mirrors the Drive upload pattern in google-drive.service.ts.
 */
function getCalendarWriteClient(): any {
  const clientId = env.GOOGLE_OAUTH_CLIENT_ID || env.GMAIL_CLIENT_ID;
  const clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET || env.GMAIL_CLIENT_SECRET;
  const refreshToken = env.GOOGLE_CALENDAR_OWNER_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    logger.warn('Calendar write OAuth2 credentials not configured — attendee sync disabled');
    return null;
  }

  if (!calendarWriteClient) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { google } = require('googleapis');
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
    oauth2.setCredentials({ refresh_token: refreshToken });
    calendarWriteClient = google.calendar({ version: 'v3', auth: oauth2 });
  }

  return calendarWriteClient;
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
}

function firstCapture(re: RegExp, s: string): string | undefined {
  const m = re.exec(s);
  return m ? m[1] : undefined;
}

const PUBLIC_TAG_REGEX = /\[PUBLIC\]/i;

// Google Calendar linkifies pasted URLs and HTML-encodes their query strings
// (e.g. "&" becomes "&amp;"). Decode so the stored URL is usable as a link.
function decodeUrlEntities(url: string): string {
  return url.replace(/&amp;/gi, '&');
}

// A Google Form link (long form or forms.gle short link) in an event
// description is effectively always a registration form.
const GOOGLE_FORM_URL_SOURCE = 'https?:\\/\\/(?:docs\\.google\\.com\\/forms\\/|forms\\.gle\\/)[^\\s"\'<>\\]]+';

/**
 * Determine whether a calendar event is publicly visible.
 *
 * An event is PUBLIC if EITHER signal says so, so leaders can mark events
 * either way and have them show on the public Events page:
 *   1. The native Google Calendar visibility dropdown is set to "Public", OR
 *   2. The event description contains a [PUBLIC] tag.
 *
 * Everything else — "private", "confidential", "default", or unset — is
 * treated as members-only (fail-closed: never leak an event by accident).
 */
export function resolveEventVisibility(
  visibility: string | null | undefined,
  description?: string | null
): 'PUBLIC' | 'MEMBER_ONLY' {
  const nativePublic = typeof visibility === 'string' && visibility.toLowerCase() === 'public';
  const taggedPublic = !!description && PUBLIC_TAG_REGEX.test(description);
  return nativePublic || taggedPublic ? 'PUBLIC' : 'MEMBER_ONLY';
}

/**
 * Clean an event description for display: strip the [PUBLIC] and [REGISTER: ...]
 * control tags (the latter may be HTML-linkified by Google Calendar). Returns
 * the cleaned text plus whether a [PUBLIC] tag was present.
 */
export function parseEventDescription(raw: string | null | undefined): ParsedDescription {
  if (!raw) return { description: '', isPublic: false };

  let text = raw;
  let isPublic = false;

  if (PUBLIC_TAG_REGEX.test(text)) {
    isPublic = true;
    text = text.replace(/\[PUBLIC\]/gi, '');
  }

  // Strip the whole [REGISTER: ...] block (up to the closing "]") so the raw
  // tag never shows in the description, regardless of its (possibly HTML) body.
  text = text.replace(/\[REGISTER:\s*.*?\]/is, '');

  return { description: text.trim(), isPublic };
}

const HREF_URL = /href=["'](https?:\/\/[^"']+)["']/i;
const BARE_URL = /(https?:\/\/[^\s"'<>\]]+)/i;

/**
 * Resolve an event's external registration URL from its (raw) description.
 *
 * For PUBLIC events we always try to give visitors something to click, in
 * priority order:
 *   1. a Google Form link (docs.google.com/forms or forms.gle),
 *   2. the URL inside an explicit [REGISTER: ...] tag,
 *   3. any other link in the description (last resort).
 *
 * For non-public events only a Google Form or an explicit [REGISTER: ...] tag
 * counts — we never turn an arbitrary link in a member event into a CTA.
 * URLs may be plain or auto-linkified by Google Calendar; href attributes are
 * preferred and &amp; entities are decoded.
 */
export function resolveRegistrationUrl(raw: string | null | undefined, isPublic: boolean): string | undefined {
  if (!raw) return undefined;

  // 1. Google Form link
  const formUrl =
    firstCapture(new RegExp(`href=["'](${GOOGLE_FORM_URL_SOURCE})["']`, 'i'), raw) ||
    firstCapture(new RegExp(`(${GOOGLE_FORM_URL_SOURCE})`, 'i'), raw);

  // 2. explicit [REGISTER: ...] tag (URL may be plain or inside an <a href>)
  let registerUrl: string | undefined;
  const registerMatch = /\[REGISTER:\s*(.*?)\]/is.exec(raw);
  if (registerMatch) {
    registerUrl = firstCapture(HREF_URL, registerMatch[1]) || firstCapture(BARE_URL, registerMatch[1]);
  }

  // 3. any link at all — only as a last resort, and only for public events
  const anyUrl = isPublic ? firstCapture(HREF_URL, raw) || firstCapture(BARE_URL, raw) : undefined;

  const chosen = isPublic ? formUrl || registerUrl || anyUrl : formUrl || registerUrl;
  return chosen ? decodeUrlEntities(chosen) : undefined;
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
  const visibility = resolveEventVisibility(event.visibility, event.description);

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
    visibility,
    externalRegistrationUrl: resolveRegistrationUrl(event.description, visibility === 'PUBLIC'),
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

// ── Attendee Management (OAuth2 write client) ────────────────────────

/**
 * Add an attendee to a Google Calendar event.
 * Uses the calendar owner's OAuth2 token so Google sends the invite email.
 * Throws on failure — caller should catch and handle gracefully.
 */
export async function addAttendeeToEvent(eventId: string, email: string): Promise<void> {
  const calendar = getCalendarWriteClient();
  if (!calendar) {
    logger.warn('Calendar write client not available — skipping attendee add', { eventId, email });
    return;
  }

  try {
    // Get the current event to read existing attendees
    const response = await calendar.events.get({
      calendarId: env.GOOGLE_CALENDAR_ID,
      eventId,
    });

    const existingAttendees: Array<{ email: string }> = response.data.attendees || [];

    // Skip if already an attendee
    if (existingAttendees.some((a: any) => a.email.toLowerCase() === email.toLowerCase())) {
      logger.info(`Attendee ${email} already on event ${eventId} — skipping`);
      return;
    }

    // Patch with the new attendee added
    await calendar.events.patch({
      calendarId: env.GOOGLE_CALENDAR_ID,
      eventId,
      sendUpdates: 'all',
      requestBody: {
        attendees: [...existingAttendees, { email }],
      },
    });

    invalidateEventCache(eventId);
    logger.info(`Added attendee ${email} to calendar event ${eventId}`);
  } catch (error: any) {
    logger.error('Failed to add attendee to calendar event', {
      eventId,
      email,
      errorMessage: error?.message,
    });
    throw error;
  }
}

/**
 * Remove an attendee from a Google Calendar event.
 * Uses the calendar owner's OAuth2 token.
 * Throws on failure — caller should catch and handle gracefully.
 */
export async function removeAttendeeFromEvent(eventId: string, email: string): Promise<void> {
  const calendar = getCalendarWriteClient();
  if (!calendar) {
    logger.warn('Calendar write client not available — skipping attendee remove', { eventId, email });
    return;
  }

  try {
    const response = await calendar.events.get({
      calendarId: env.GOOGLE_CALENDAR_ID,
      eventId,
    });

    const existingAttendees: Array<{ email: string }> = response.data.attendees || [];
    const filtered = existingAttendees.filter(
      (a: any) => a.email.toLowerCase() !== email.toLowerCase()
    );

    // Skip if attendee wasn't present
    if (filtered.length === existingAttendees.length) {
      logger.info(`Attendee ${email} not on event ${eventId} — skipping removal`);
      return;
    }

    await calendar.events.patch({
      calendarId: env.GOOGLE_CALENDAR_ID,
      eventId,
      sendUpdates: 'all',
      requestBody: {
        attendees: filtered,
      },
    });

    invalidateEventCache(eventId);
    logger.info(`Removed attendee ${email} from calendar event ${eventId}`);
  } catch (error: any) {
    logger.error('Failed to remove attendee from calendar event', {
      eventId,
      email,
      errorMessage: error?.message,
    });
    throw error;
  }
}