import { format } from 'date-fns';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';

import LinkifyText from '../components/LinkifyText';
import { useAuth } from '../context/AuthContext';

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
}

export default function EventsPage() {
  const { isAuthenticated } = useAuth();
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(EVENTS_PER_PAGE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql';
    const token = localStorage.getItem('token');
    const isLoggedIn = !!token;
    fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `query { events(publicOnly: ${!isLoggedIn}) { id title description startTime endTime location visibility externalRegistrationUrl isAllDay registrationCount } }`,
      }),
    })
      .then((res) => res.json())
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
                className="card hover:shadow-lg transition-shadow"
              >
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                      {format(new Date(event.startTime), 'MMM d, yyyy')}
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
                <p className="text-gray-600 mb-4 line-clamp-2"><LinkifyText text={event.description} /></p>

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
                      <span>{format(new Date(event.startTime), 'h:mm a')} - {format(new Date(event.endTime), 'h:mm a')}</span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <span className="mr-2">&#128101;</span>
                    <span>{event.registrationCount} attending</span>
                  </div>
                </div>
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
