import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

import LinkifyText from '../components/LinkifyText';
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

const RSVP_OPTIONS = [
  { value: 'ATTENDING', label: 'Will attend', icon: '\u2705' },
  { value: 'MAYBE', label: 'Maybe', icon: '\uD83E\uDD14' },
  { value: 'NOT_ATTENDING', label: "Won't attend", icon: '\u274C' },
  { value: 'ATTENDING_PLUS', label: 'Attending + bringing others', icon: '\uD83D\uDC65' },
];

function rsvpLabel(status: string): string {
  return RSVP_OPTIONS.find((o) => o.value === status)?.label || status;
}

export default function EventDetailPage() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const [event, setEvent] = useState<EventDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [showRsvpPicker, setShowRsvpPicker] = useState(false);
  const [rsvpError, setRsvpError] = useState<string | null>(null);
  const [guestCount, setGuestCount] = useState(1);

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

  const handleRsvp = async (status: string, guests: number = 0) => {
    const token = localStorage.getItem('token');
    if (!token || !event) return;

    setRsvpLoading(true);
    setRsvpError(null);
    setShowRsvpPicker(false);

    try {
      const res = await fetch(graphqlUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: `mutation RsvpEvent($input: RsvpInput!) { rsvpEvent(input: $input) }`,
          variables: {
            input: { eventId: event.id, status, guestCount: guests },
          },
        }),
      });

      const result = await res.json();
      if (result.errors?.length) {
        setRsvpError(result.errors[0].message);
        return;
      }

      await fetchEvent();
    } catch (err) {
      setRsvpError('Network error — please try again.');
    } finally {
      setRsvpLoading(false);
    }
  };

  const handleCancelRsvp = async () => {
    const token = localStorage.getItem('token');
    if (!token || !event) return;

    setRsvpLoading(true);
    setRsvpError(null);

    try {
      const res = await fetch(graphqlUrl, {
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

      const result = await res.json();
      if (result.errors?.length) {
        setRsvpError(result.errors[0].message);
        return;
      }

      await fetchEvent();
    } catch (err) {
      setRsvpError('Network error — please try again.');
    } finally {
      setRsvpLoading(false);
    }
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

  const startTime = new Date(event.startTime);
  const endTime = new Date(event.endTime);
  const hasExternalRegistration = !!event.externalRegistrationUrl;
  const userStatus = event.userRsvpStatus;

  return (
    <div className="max-w-4xl mx-auto">
      <Link to="/events" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
        &larr; Back to Events
      </Link>

      <div className="card">
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
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(event.location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-700 underline"
                  >
                    {event.location}
                  </a>
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
          <p className="text-gray-700 whitespace-pre-line"><LinkifyText text={event.description} /></p>
        </div>

        {rsvpError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {rsvpError}
          </div>
        )}

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

        {/* RSVP note for external registration events */}
        {hasExternalRegistration && isAuthenticated && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
            <p className="text-sm text-yellow-800 mb-3">
              <strong>Note:</strong> RSVP does not register you for this event.
              You must register via the link above.
            </p>
          </div>
        )}

        {/* RSVP Section */}
        {isAuthenticated && (
          <div>
            {userStatus ? (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-gray-600">
                  Your RSVP: <strong>{rsvpLabel(userStatus)}</strong>
                </span>
                <button
                  onClick={() => setShowRsvpPicker(true)}
                  disabled={rsvpLoading}
                  className="btn-secondary text-sm"
                >
                  Change
                </button>
                <button
                  onClick={handleCancelRsvp}
                  disabled={rsvpLoading}
                  className="text-sm text-red-600 hover:text-red-700 underline"
                >
                  {rsvpLoading ? 'Processing...' : 'Remove RSVP'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowRsvpPicker(true)}
                disabled={rsvpLoading}
                className="btn-primary"
              >
                RSVP to Event
              </button>
            )}
          </div>
        )}

        {!isAuthenticated && (
          <Link to="/login" className="btn-primary inline-block">
            Log In to RSVP
          </Link>
        )}
      </div>

      {/* RSVP Status Picker Dialog */}
      {showRsvpPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">RSVP to this event</h3>
            <div className="space-y-2 mb-4">
              {RSVP_OPTIONS.map((option) => (
                <div key={option.value}>
                  <button
                    onClick={() => {
                      if (option.value === 'ATTENDING_PLUS') return;
                      handleRsvp(option.value);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                      option.value === 'ATTENDING_PLUS'
                        ? 'border-gray-200 bg-gray-50'
                        : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50'
                    } ${userStatus === option.value ? 'border-primary-500 bg-primary-50' : ''}`}
                  >
                    <span className="mr-2">{option.icon}</span>
                    {option.label}
                  </button>
                  {option.value === 'ATTENDING_PLUS' && (
                    <div className="flex items-center gap-2 mt-2 ml-8">
                      <label className="text-sm text-gray-600">How many guests?</label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={guestCount}
                        onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value) || 1))}
                        className="input w-20 text-sm"
                      />
                      <button
                        onClick={() => handleRsvp('ATTENDING_PLUS', guestCount)}
                        className="btn-primary text-sm"
                      >
                        Confirm
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowRsvpPicker(false)}
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
