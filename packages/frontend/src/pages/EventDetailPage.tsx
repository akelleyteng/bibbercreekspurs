import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

interface EventDetailData {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location?: string;
  visibility: string;
  eventType: string;
  externalRegistrationUrl?: string;
  imageUrl?: string;
  registrationCount: number;
  userRegistrationStatus?: string;
  creator: { id: string; firstName: string; lastName: string };
}

export default function EventDetailPage() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const [event, setEvent] = useState<EventDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rsvpLoading, setRsvpLoading] = useState(false);

  const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql';

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `query GetEvent($id: String!) {
          event(id: $id) {
            id title description startTime endTime location visibility eventType
            externalRegistrationUrl imageUrl registrationCount userRegistrationStatus
            creator { id firstName lastName }
          }
        }`,
        variables: { id },
      }),
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.data?.event) {
          setEvent(result.data.event);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, graphqlUrl]);

  const handleRsvp = async () => {
    const token = localStorage.getItem('token');
    if (!token || !event) return;

    setRsvpLoading(true);
    const isRsvped = event.userRegistrationStatus === 'REGISTERED';
    const mutation = isRsvped
      ? `mutation CancelRsvp($eventId: String!) { cancelRsvp(eventId: $eventId) }`
      : `mutation RsvpEvent($eventId: String!) { rsvpEvent(eventId: $eventId) }`;

    await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: mutation,
        variables: { eventId: event.id },
      }),
    });

    // Refresh event data
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `query GetEvent($id: String!) {
          event(id: $id) {
            id title description startTime endTime location visibility eventType
            externalRegistrationUrl imageUrl registrationCount userRegistrationStatus
            creator { id firstName lastName }
          }
        }`,
        variables: { id: event.id },
      }),
    });
    const result = await res.json();
    if (result.data?.event) {
      setEvent(result.data.event);
    }
    setRsvpLoading(false);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading event...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h2>
        <Link to="/events" className="btn-primary">Back to Events</Link>
      </div>
    );
  }

  const isRsvped = event.userRegistrationStatus === 'REGISTERED';
  const startTime = new Date(event.startTime);
  const endTime = new Date(event.endTime);

  return (
    <div className="max-w-4xl mx-auto">
      <Link to="/events" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
        ← Back to Events
      </Link>

      <div className="card">
        {event.imageUrl && (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-64 object-cover rounded-lg mb-6"
          />
        )}

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
              {format(startTime, 'EEEE, MMMM d, yyyy')}
            </span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              event.visibility === 'PUBLIC'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-purple-100 text-purple-800'
            }`}>
              {event.visibility === 'PUBLIC' ? '🌐 Public Event' : '🔒 Members Only'}
            </span>
          </div>
          <div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              event.eventType === 'internal'
                ? 'bg-green-100 text-green-800'
                : 'bg-orange-100 text-orange-800'
            }`}>
              {event.eventType === 'internal' ? '📍 Internal Event (RSVP)' : '🔗 External Event (Register Online)'}
            </span>
          </div>
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-6">{event.title}</h1>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-4">
            <div className="flex items-start">
              <span className="text-2xl mr-3">⏰</span>
              <div>
                <p className="font-semibold text-gray-900">Time</p>
                <p className="text-gray-600">
                  {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <span className="text-2xl mr-3">📍</span>
              <div>
                <p className="font-semibold text-gray-900">Location</p>
                <p className="text-gray-600">{event.location}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start">
              <span className="text-2xl mr-3">👤</span>
              <div>
                <p className="font-semibold text-gray-900">Organizer</p>
                <p className="text-gray-600">
                  {event.creator.firstName} {event.creator.lastName}
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <span className="text-2xl mr-3">👥</span>
              <div>
                <p className="font-semibold text-gray-900">Attendees</p>
                <p className="text-gray-600">{event.registrationCount} registered</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Description</h2>
          <p className="text-gray-700 whitespace-pre-line">{event.description}</p>
        </div>

        {event.eventType === 'internal' ? (
          isAuthenticated ? (
            <button
              onClick={handleRsvp}
              disabled={rsvpLoading}
              className={isRsvped ? 'btn-secondary' : 'btn-primary'}
            >
              {rsvpLoading ? 'Processing...' : isRsvped ? '✓ RSVP Confirmed — Click to Cancel' : 'RSVP to Event'}
            </button>
          ) : (
            <Link to="/login" className="btn-primary inline-block">
              Log In to RSVP
            </Link>
          )
        ) : (
          event.externalRegistrationUrl && (
            <a
              href={event.externalRegistrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-block"
            >
              Register on External Site →
            </a>
          )
        )}
      </div>
    </div>
  );
}
