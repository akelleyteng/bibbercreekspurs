import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

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
  }, [isAuthenticated]);

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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
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
              <p className="text-gray-600 mb-4 line-clamp-2">{event.description}</p>

              <div className="space-y-2 text-sm text-gray-600">
                {event.location && (
                  <div className="flex items-center">
                    <span className="mr-2">&#128205;</span>
                    <span>{event.location}</span>
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
      )}
    </div>
  );
}
