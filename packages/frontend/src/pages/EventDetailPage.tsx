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
  externalRegistrationUrl?: string;
  isAllDay: boolean;
  registrationCount: number;
  userRsvpStatus?: string;
}

const EVENT_QUERY = `query GetEvent($id: String!) {
  event(id: $id) {
    id title description startTime endTime location visibility
    externalRegistrationUrl isAllDay registrationCount userRsvpStatus
  }
}`;

export default function EventDetailPage() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const [event, setEvent] = useState<EventDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [showRsvpDialog, setShowRsvpDialog] = useState(false);

  const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql';

  const fetchEvent = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(graphqlUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          query: EVENT_QUERY,
          variables: { id },
        }),
      });
      const result = await res.json();
      if (result.data?.event) {
        setEvent(result.data.event);
      }
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    fetchEvent().finally(() => setLoading(false));
  }, [id, graphqlUrl]);

  const handleRsvp = async (addToCalendar: boolean) => {
    const token = localStorage.getItem('token');
    if (!token || !event) return;

    setRsvpLoading(true);
    setShowRsvpDialog(false);

    await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `mutation RsvpEvent($input: RsvpInput!) { rsvpEvent(input: $input) }`,
        variables: {
          input: { eventId: event.id, addToCalendar },
        },
      }),
    });

    await fetchEvent();
    setRsvpLoading(false);
  };

  const handleCancelRsvp = async () => {
    const token = localStorage.getItem('token');
    if (!token || !event) return;

    setRsvpLoading(true);

    await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `mutation CancelRsvp($eventId: String!) { cancelRsvp(eventId: $eventId) }`,
        variables: { eventId: event.id },
      }),
    });

    await fetchEvent();
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

  const isRsvped = !!event.userRsvpStatus;
  const startTime = new Date(event.startTime);
  const endTime = new Date(event.endTime);
  const hasExternalRegistration = !!event.externalRegistrationUrl;

  return (
    <div className="max-w-4xl mx-auto">
      <Link to="/events" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
        &larr; Back to Events
      </Link>

      <div className="card">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
              {event.isAllDay
                ? format(startTime, 'EEEE, MMMM d, yyyy')
                : format(startTime, 'EEEE, MMMM d, yyyy')}
            </span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              event.visibility === 'PUBLIC'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-purple-100 text-purple-800'
            }`}>
              {event.visibility === 'PUBLIC' ? 'Public Event' : 'Members Only'}
            </span>
          </div>
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-6">{event.title}</h1>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-4">
            {!event.isAllDay && (
              <div className="flex items-start">
                <span className="text-2xl mr-3">&#9200;</span>
                <div>
                  <p className="font-semibold text-gray-900">Time</p>
                  <p className="text-gray-600">
                    {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                  </p>
                </div>
              </div>
            )}

            {event.location && (
              <div className="flex items-start">
                <span className="text-2xl mr-3">&#128205;</span>
                <div>
                  <p className="font-semibold text-gray-900">Location</p>
                  <p className="text-gray-600">{event.location}</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-start">
              <span className="text-2xl mr-3">&#128101;</span>
              <div>
                <p className="font-semibold text-gray-900">Attendees</p>
                <p className="text-gray-600">{event.registrationCount} attending</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Description</h2>
          <p className="text-gray-700 whitespace-pre-line">{event.description}</p>
        </div>

        {/* External Registration Link */}
        {hasExternalRegistration && (
          <div className="mb-6">
            <a
              href={event.externalRegistrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-block"
            >
              Register for this Event &rarr;
            </a>
          </div>
        )}

        {/* RSVP section for logged-in users on events WITH external registration */}
        {hasExternalRegistration && isAuthenticated && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
            <p className="text-sm text-yellow-800 mb-3">
              <strong>Note:</strong> RSVP does not register you for this event.
              You must register via the link above. RSVP adds this event to your
              calendar so you get reminders.
            </p>
            {isRsvped ? (
              <button
                onClick={handleCancelRsvp}
                disabled={rsvpLoading}
                className="btn-secondary text-sm"
              >
                {rsvpLoading ? 'Processing...' : 'Cancel RSVP'}
              </button>
            ) : (
              <button
                onClick={() => setShowRsvpDialog(true)}
                disabled={rsvpLoading}
                className="btn-secondary text-sm"
              >
                RSVP for Calendar Reminders
              </button>
            )}
          </div>
        )}

        {/* Standard RSVP for events WITHOUT external registration */}
        {!hasExternalRegistration && isAuthenticated && (
          isRsvped ? (
            <button
              onClick={handleCancelRsvp}
              disabled={rsvpLoading}
              className="btn-secondary"
            >
              {rsvpLoading ? 'Processing...' : 'RSVP Confirmed - Click to Cancel'}
            </button>
          ) : (
            <button
              onClick={() => setShowRsvpDialog(true)}
              disabled={rsvpLoading}
              className="btn-primary"
            >
              RSVP to Event
            </button>
          )
        )}

        {!hasExternalRegistration && !isAuthenticated && (
          <Link to="/login" className="btn-primary inline-block">
            Log In to RSVP
          </Link>
        )}
      </div>

      {/* Calendar Invite Dialog */}
      {showRsvpDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add to your Google Calendar?</h3>
            <p className="text-gray-600 mb-6">
              Would you like this event added to your personal Google Calendar?
              You'll receive an email invitation with event details and reminders.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleRsvp(true)}
                className="btn-primary flex-1"
              >
                Yes, add to my calendar
              </button>
              <button
                onClick={() => handleRsvp(false)}
                className="btn-secondary flex-1"
              >
                No thanks, just RSVP
              </button>
            </div>
            <button
              onClick={() => setShowRsvpDialog(false)}
              className="mt-3 text-sm text-gray-500 hover:text-gray-700 w-full text-center"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
