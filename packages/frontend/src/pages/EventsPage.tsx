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

  const hasMore = visibleCount < events.length;

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + EVENTS_PER_PAGE, events.length));
  }, [events.length]);

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

  const handleQuickRsvp = async (e: React.MouseEvent, eventId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!localStorage.getItem('token')) return;

    setRsvpLoadingIds((prev) => new Set(prev).add(eventId));
    try {
      const result = await authFetch(
        `mutation RsvpEvent($input: RsvpInput!) { rsvpEvent(input: $input) }`,
        { input: { eventId, status: 'ATTENDING', guestCount: 0 } },
      );
      if (!result.errors?.length) {
        setEvents((prev) =>
          prev.map((ev) =>
            ev.id === eventId
              ? { ...ev, userRsvpStatus: 'ATTENDING', registrationCount: ev.registrationCount + 1 }
              : ev
          )
        );
      }
    } catch {
      // silently fail — user can retry or use detail page
    } finally {
      setRsvpLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
    }
  };

  const visibleEvents = events.slice(0, visibleCount);

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Upcoming Events</h1>
        <p className="text-gray-500 text-center py-12">Loading events...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Upcoming Events</h1>

      {events.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No upcoming events at this time. Check back soon!</p>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {visibleEvents.map((event) => (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className="card hover:shadow-lg transition-shadow flex flex-col"
              >
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                      {format(parseEventDate(event.startTime), 'MMM d, yyyy')}
                    </span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
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

                <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
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
                  <div className="flex items-center">
                    <span className="mr-2">&#128101;</span>
                    <span>{event.registrationCount} attending</span>
                  </div>
                </div>

                {/* RSVP button */}
                {isAuthenticated && (
                  <div className="mt-auto pt-4 flex justify-center md:justify-end">
                    {event.userRsvpStatus ? (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                        {RSVP_LABELS[event.userRsvpStatus] || event.userRsvpStatus}
                      </span>
                    ) : (
                      <button
                        onClick={(e) => handleQuickRsvp(e, event.id)}
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
    </div>
  );
}
