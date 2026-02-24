/**
 * Parse an event time string into a local Date.
 * Date-only strings like "2026-02-23" from Google Calendar all-day events
 * must be parsed as local midnight, not UTC (which shifts to the previous day
 * in US time zones).
 */
export function parseEventDate(dateStr: string): Date {
  if (dateStr.length === 10 && !dateStr.includes('T')) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(dateStr);
}
