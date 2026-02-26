import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { authFetch } from '../utils/authFetch';
import { parseEventDate } from '../utils/dateUtils';
import { formatDescription } from '../utils/formatDescription';

interface EventPresenter {
  firstName: string;
  lastName: string;
  title: string;
  profilePhotoUrl?: string;
}

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
  agendaUrl?: string;
  meetingId?: string;
  presenters?: EventPresenter[];
}

const EVENT_QUERY = `query GetEvent($id: String!) {
  event(id: $id) {
    id title description startTime endTime location visibility
    externalRegistrationUrl isAllDay registrationCount userRsvpStatus
    agendaUrl meetingId
    presenters { firstName lastName title profilePhotoUrl }
  }
}`;

/** Transform a Google Docs/Drive URL to open in edit or preview mode. */
function agendaHref(url: string, canEdit: boolean): string {
  const base = url.replace(/\/(edit|preview|view)(#.*|\?.*)?$/, '');
  return canEdit ? `${base}/edit` : `${base}/preview`;
}

const RSVP_OPTIONS = [
  { value: 'ATTENDING', label: 'Attending', shortLabel: 'Attending', icon: '\u2705' },
  { value: 'MAYBE', label: 'Maybe', shortLabel: 'Maybe', icon: '\uD83E\uDD14' },
  { value: 'NOT_ATTENDING', label: "Won't attend", shortLabel: "Can't go", icon: '\u274C' },
  { value: 'ATTENDING_PLUS', label: 'Attending + guests', shortLabel: '+ Guests', icon: '\uD83D\uDC65' },
];

export default function EventDetailPage() {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuth();
  const [event, setEvent] = useState<EventDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [rsvpError, setRsvpError] = useState<string | null>(null);
  const [guestCount, setGuestCount] = useState(1);
  const [showGuestInput, setShowGuestInput] = useState(false);
  const [canEditAgenda, setCanEditAgenda] = useState(false);

  const fetchEvent = async () => {
    try {
      const [eventResult, managerResult] = await Promise.all([
        authFetch(EVENT_QUERY, { id }),
        isAuthenticated
          ? authFetch(`query { isCurrentUserPresentationManager }`)
          : Promise.resolve({ data: null }),
      ]);
      if (eventResult.data?.event) {
        setEvent(eventResult.data.event);
      }
      const isManager = managerResult.data?.isCurrentUserPresentationManager === true;
      setCanEditAgenda(user?.role === 'ADMIN' || isManager);
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    fetchEvent().finally(() => setLoading(false));
  }, [id]);

  const handleRsvp = async (status: string, guests: number = 0) => {
    if (!localStorage.getItem('token') || !event) return;

    setRsvpLoading(true);
    setRsvpError(null);

    try {
      const result = await authFetch(
        `mutation RsvpEvent($input: RsvpInput!) { rsvpEvent(input: $input) }`,
        { input: { eventId: event.id, status, guestCount: guests } },
      );

      if (result.errors?.length) {
        setRsvpError(result.errors[0].message);
        return;
      }

      setShowGuestInput(false);
      await fetchEvent();
    } catch {
      setRsvpError('Network error — please try again.');
    } finally {
      setRsvpLoading(false);
    }
  };

  const handleCancelRsvp = async () => {
    if (!localStorage.getItem('token') || !event) return;

    setRsvpLoading(true);
    setRsvpError(null);

    try {
      const result = await authFetch(
        `mutation CancelRsvp($eventId: String!) { cancelRsvp(eventId: $eventId) }`,
        { eventId: event.id },
      );

      if (result.errors?.length) {
        setRsvpError(result.errors[0].message);
        return;
      }

      setShowGuestInput(false);
      await fetchEvent();
    } catch {
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

  const startTime = parseEventDate(event.startTime);
  const endTime = parseEventDate(event.endTime);
  const hasExternalRegistration = !!event.externalRegistrationUrl;
  const userStatus = event.userRsvpStatus;

  return (
    <div className="max-w-4xl mx-auto">
      <Link to="/events" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
        &larr; Back to Events
      </Link>

      <div className="card">
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium bg-primary-100 text-primary-800">
              {format(startTime, 'EEE, MMM d, yyyy')}
            </span>
            <span className={`inline-flex items-center px-2 py-1 sm:px-3 rounded-full text-xs font-medium ${
              event.visibility === 'PUBLIC'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-purple-100 text-purple-800'
            }`}>
              {event.visibility === 'PUBLIC' ? 'Public' : 'Members'}
            </span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-4 sm:mb-6">{event.title}</h1>

        <div className="grid md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="space-y-3 sm:space-y-4">
            {!event.isAllDay && (
              <div className="flex items-start">
                <span className="text-xl sm:text-2xl mr-2 sm:mr-3">&#9200;</span>
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
                <span className="text-xl sm:text-2xl mr-2 sm:mr-3">&#128205;</span>
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

          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-start">
              <span className="text-xl sm:text-2xl mr-2 sm:mr-3">&#128101;</span>
              <div>
                <p className="font-semibold text-gray-900">Attendees</p>
                <p className="text-gray-600">{event.registrationCount} attending</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">Description</h2>
          <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: formatDescription(event.description) }} />
        </div>

        {/* Agenda Link */}
        {event.agendaUrl && (
          <div className="mb-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <span className="text-xl sm:text-2xl mr-2 sm:mr-3">&#128196;</span>
              <div>
                <p className="font-semibold text-gray-900">Meeting Agenda</p>
                <a
                  href={agendaHref(event.agendaUrl, canEditAgenda)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700 underline"
                >
                  {canEditAgenda ? 'Edit Agenda' : 'View Agenda'}
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Presenters */}
        {event.presenters && event.presenters.length > 0 && (
          <div className="mb-8">
            {event.meetingId ? (
              <Link
                to={`/presentations?meeting=${event.meetingId}`}
                className="text-xl font-bold text-primary-600 hover:text-primary-700 mb-3 inline-flex items-center gap-1"
              >
                Presentations &rarr;
              </Link>
            ) : (
              <h2 className="text-xl font-bold text-gray-900 mb-3">Presentations</h2>
            )}
            <div className="space-y-3">
              {event.presenters.map((presenter, idx) => (
                <div key={idx} className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <img
                    src={presenter.profilePhotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(presenter.firstName + ' ' + presenter.lastName)}&background=4f772d&color=fff&size=40`}
                    alt={`${presenter.firstName} ${presenter.lastName}`}
                    className="w-10 h-10 rounded-full object-cover mr-3"
                  />
                  <div>
                    <p className="font-semibold text-gray-900">{presenter.firstName} {presenter.lastName}</p>
                    <p className="text-sm text-gray-600">{presenter.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> RSVP does not register you for this event.
              You must register via the link above.
            </p>
          </div>
        )}

        {/* Inline RSVP Options */}
        {isAuthenticated && (
          <div className="border-t border-gray-200 pt-5 mt-6">
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              {RSVP_OPTIONS.map((option) => {
                const isSelected = userStatus === option.value;
                if (option.value === 'ATTENDING_PLUS') {
                  return (
                    <button
                      key={option.value}
                      onClick={() => setShowGuestInput(!showGuestInput)}
                      disabled={rsvpLoading}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-colors disabled:opacity-50 ${
                        isSelected
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-primary-300 hover:bg-primary-50'
                      }`}
                    >
                      <span>{option.icon}</span>
                      <span className="hidden sm:inline">{option.label}</span>
                      <span className="sm:hidden">{option.shortLabel}</span>
                    </button>
                  );
                }
                return (
                  <button
                    key={option.value}
                    onClick={() => handleRsvp(option.value)}
                    disabled={rsvpLoading}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-colors disabled:opacity-50 ${
                      isSelected
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-primary-300 hover:bg-primary-50'
                    }`}
                  >
                    <span>{option.icon}</span>
                    <span className="hidden sm:inline">{option.label}</span>
                    <span className="sm:hidden">{option.shortLabel}</span>
                  </button>
                );
              })}
            </div>

            {/* Guest count input for ATTENDING_PLUS */}
            {showGuestInput && (
              <div className="flex flex-wrap items-center gap-2 mt-3 ml-1">
                <label className="text-sm text-gray-600">How many guests?</label>
                <div className="flex items-center gap-2">
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
                    disabled={rsvpLoading}
                    className="btn-primary text-sm"
                  >
                    {rsvpLoading ? 'Saving...' : 'Confirm'}
                  </button>
                </div>
              </div>
            )}

            {/* Remove RSVP link */}
            {userStatus && (
              <div className="mt-3">
                <button
                  onClick={handleCancelRsvp}
                  disabled={rsvpLoading}
                  className="text-sm text-red-600 hover:text-red-700 underline"
                >
                  {rsvpLoading ? 'Processing...' : 'Remove RSVP'}
                </button>
              </div>
            )}
          </div>
        )}

        {!isAuthenticated && (
          <Link to="/login" className="btn-primary inline-block">
            Log In to RSVP
          </Link>
        )}
      </div>
    </div>
  );
}
