import { format } from 'date-fns';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { authFetch } from '../utils/authFetch';
import { parseEventDate } from '../utils/dateUtils';
import { formatDescription } from '../utils/formatDescription';

const EVENTS_PER_PAGE = 10;

interface EventData {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location?: string;
  visibility: string;
  externalRegistrationUrl?: string;
  isAllDay: boolean;
  registrationCount: number;
  userRsvpStatus?: string;
}

const RSVP_OPTIONS = [
  { value: 'ATTENDING', label: 'Attending', icon: '\u2705' },
  { value: 'MAYBE', label: 'Maybe', icon: '\uD83E\uDD14' },
  { value: 'NOT_ATTENDING', label: "Won't attend", icon: '\u274C' },
  { value: 'ATTENDING_PLUS', label: '+ Guests', icon: '\uD83D\uDC65' },
];

const RSVP_LABELS: Record<string, string> = {
  ATTENDING: '\u2705 Attending',
  MAYBE: '\uD83E\uDD14 Maybe',
  NOT_ATTENDING: '\u274C Not attending',
  ATTENDING_PLUS: '\uD83D\uDC65 Attending +',
};

export default function EventsPage() {
  const { isAuthenticated } = useAuth();
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(EVENTS_PER_PAGE);
  const [rsvpLoadingIds, setRsvpLoadingIds] = useState<Set<string>>(new Set());
  const [rsvpPickerEventId, setRsvpPickerEventId] = useState<string | null>(null);
  const [guestCount, setGuestCount] = useState(1);
  const [visibilityFilter, setVisibilityFilter] = useState<'ALL' | 'PUBLIC' | 'MEMBER_ONLY'>('ALL');
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isLoggedIn = !!localStorage.getItem('token');
    authFetch(`query { events(publicOnly: ${!isLoggedIn}) { id title description startTime endTime location visibility externalRegistrationUrl isAllDay registrationCount userRsvpStatus } }`)
      .then((result) => {
        if (result.data?.events) {
          setEvents(result.data.events);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    setVisibleCount(EVENTS_PER_PAGE);
  }, [isAuthenticated]);

  const filteredEvents = visibilityFilter === 'ALL'
    ? events
    : events.filter(e => e.visibility === visibilityFilter);

  const hasMore = visibleCount < filteredEvents.length;

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + EVENTS_PER_PAGE, filteredEvents.length));
  }, [filteredEvents.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const handleRsvp = async (eventId: string, status: string, guests: number = 0) => {
    if (!localStorage.getItem('token')) return;

    setRsvpLoadingIds((prev) => new Set(prev).add(eventId));
    setRsvpPickerEventId(null);
    try {
      const result = await authFetch(
        `mutation RsvpEvent($input: RsvpInput!) { rsvpEvent(input: $input) }`,
        { input: { eventId, status, guestCount: guests } },
      );
      if (!result.errors?.length) {
        const countsAsAttending = status === 'ATTENDING' || status === 'ATTENDING_PLUS';
        setEvents((prev) =>
          prev.map((ev) => {
            if (ev.id !== eventId) return ev;
            const wasAttending = ev.userRsvpStatus === 'ATTENDING' || ev.userRsvpStatus === 'ATTENDING_PLUS';
            let countDelta = 0;
            if (countsAsAttending && !wasAttending) countDelta = 1;
            else if (!countsAsAttending && wasAttending) countDelta = -1;
            return { ...ev, userRsvpStatus: status, registrationCount: ev.registrationCount + countDelta };
          })
        );
      }
    } catch {
      // silently fail
    } finally {
      setRsvpLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
    }
  };

  const visibleEvents = filteredEvents.slice(0, visibleCount);

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-8">Upcoming Events</h1>
        <p className="text-gray-500 text-center py-12">Loading events...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Upcoming Events</h1>
        {isAuthenticated && (
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {([['ALL', 'All'], ['PUBLIC', 'Public'], ['MEMBER_ONLY', 'Members Only']] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => { setVisibilityFilter(value); setVisibleCount(EVENTS_PER_PAGE); }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  visibilityFilter === value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {filteredEvents.length === 0 ? (
        <p className="text-gray-500 text-center py-12">
          {visibilityFilter === 'ALL'
            ? 'No upcoming events at this time. Check back soon!'
            : `No ${visibilityFilter === 'PUBLIC' ? 'public' : 'members only'} events at this time.`}
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {visibleEvents.map((event) => (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className="card hover:shadow-lg transition-shadow flex flex-col"
              >
                <div className="mb-3 sm:mb-4">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="inline-flex items-center px-2.5 py-1 sm:px-3 rounded-full text-xs sm:text-sm font-medium bg-primary-100 text-primary-800">
                      {format(parseEventDate(event.startTime), 'MMM d, yyyy')}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs font-medium ${
                      event.visibility === 'PUBLIC'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {event.visibility === 'PUBLIC' ? 'Public' : 'Members Only'}
                    </span>
                  </div>
                  {event.externalRegistrationUrl && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
                      External Registration
                    </span>
                  )}
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
                <div className="prose prose-sm max-w-none text-gray-600 mb-4 line-clamp-2" dangerouslySetInnerHTML={{ __html: formatDescription(event.description) }} />

                <div className="space-y-2 text-sm text-gray-600">
                  {event.location && (
                    <div className="flex items-center">
                      <span className="mr-2">&#128205;</span>
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(event.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700 underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {event.location}
                      </a>
                    </div>
                  )}
                  {!event.isAllDay && (
                    <div className="flex items-center">
                      <span className="mr-2">&#9200;</span>
                      <span>{format(parseEventDate(event.startTime), 'h:mm a')} - {format(parseEventDate(event.endTime), 'h:mm a')}</span>
                    </div>
                  )}
                  {event.visibility !== 'PUBLIC' && (
                    <div className="flex items-center">
                      <span className="mr-2">&#128101;</span>
                      <span>{event.registrationCount} attending</span>
                    </div>
                  )}
                </div>

                {/* RSVP button */}
                {isAuthenticated && (
                  <div className="mt-auto pt-4 flex justify-center md:justify-end">
                    {event.userRsvpStatus ? (
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRsvpPickerEventId(event.id); setGuestCount(1); }}
                        className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
                      >
                        {RSVP_LABELS[event.userRsvpStatus] || event.userRsvpStatus}
                      </button>
                    ) : (
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRsvpPickerEventId(event.id); setGuestCount(1); }}
                        disabled={rsvpLoadingIds.has(event.id)}
                        className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
                      >
                        {rsvpLoadingIds.has(event.id) ? 'Saving...' : 'RSVP'}
                      </button>
                    )}
                  </div>
                )}
              </Link>
            ))}
          </div>

          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-8">
              <div className="flex items-center gap-2 text-gray-500">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm">Loading more events...</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* RSVP Picker Modal */}
      {rsvpPickerEventId && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setRsvpPickerEventId(null)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">RSVP</h3>
            <div className="space-y-2 mb-4">
              {RSVP_OPTIONS.map((option) => {
                const currentStatus = events.find((e) => e.id === rsvpPickerEventId)?.userRsvpStatus;
                const isSelected = currentStatus === option.value;
                if (option.value === 'ATTENDING_PLUS') {
                  return (
                    <div key={option.value}>
                      <button
                        disabled={rsvpLoadingIds.has(rsvpPickerEventId)}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                          isSelected
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <span className="mr-2">{option.icon}</span>
                        {option.label}
                      </button>
                      <div className="flex flex-wrap items-center gap-2 mt-2 ml-4 sm:ml-8">
                        <label className="text-sm text-gray-600">Guests:</label>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={guestCount}
                          onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value) || 1))}
                          className="input w-20 text-sm"
                        />
                        <button
                          onClick={() => handleRsvp(rsvpPickerEventId, 'ATTENDING_PLUS', guestCount)}
                          disabled={rsvpLoadingIds.has(rsvpPickerEventId)}
                          className="btn-primary text-sm disabled:opacity-50"
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  );
                }
                return (
                  <button
                    key={option.value}
                    onClick={() => handleRsvp(rsvpPickerEventId, option.value)}
                    disabled={rsvpLoadingIds.has(rsvpPickerEventId)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors disabled:opacity-50 ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50'
                    }`}
                  >
                    <span className="mr-2">{option.icon}</span>
                    {option.label}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setRsvpPickerEventId(null)}
              className="text-sm text-gray-500 hover:text-gray-700 w-full text-center"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
