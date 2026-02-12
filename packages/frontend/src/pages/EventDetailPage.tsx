import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { mockEvents } from '../data/mockData';
import { format } from 'date-fns';

export default function EventDetailPage() {
  const { id } = useParams();
  const event = mockEvents.find((e) => e.id === id);
  const [isRsvped, setIsRsvped] = useState(false);

  if (!event) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h2>
        <Link to="/events" className="btn-primary">Back to Events</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link to="/events" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
        ← Back to Events
      </Link>
      
      <div className="card">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
              {format(event.startTime, 'EEEE, MMMM d, yyyy')}
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
                  {format(event.startTime, 'h:mm a')} - {format(event.endTime, 'h:mm a')}
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
          <button
            onClick={() => setIsRsvped(!isRsvped)}
            className={isRsvped ? 'btn-secondary' : 'btn-primary'}
          >
            {isRsvped ? '✓ RSVP Confirmed' : 'RSVP to Event'}
          </button>
        ) : (
          <a
            href={event.externalRegistrationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-block"
          >
            Register on External Site →
          </a>
        )}
      </div>
    </div>
  );
}
