import { format } from 'date-fns';
import { useState, useEffect, useCallback } from 'react';

import EventModal from '../components/EventModal';
import SponsorModal from '../components/SponsorModal';
import TestimonialModal from '../components/TestimonialModal';
import { mockHomeContent, mockSponsors, mockEvents } from '../data/mockData';

interface TestimonialData {
  id: string;
  authorName: string;
  authorRole?: string;
  content: string;
  imageUrl?: string;
  isActive: boolean;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'home' | 'events' | 'sponsors' | 'testimonials'>('home');
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [isSponsorModalOpen, setIsSponsorModalOpen] = useState(false);
  const [editingSponsorId, setEditingSponsorId] = useState<string | null>(null);
  const [isTestimonialModalOpen, setIsTestimonialModalOpen] = useState(false);
  const [editingTestimonialId, setEditingTestimonialId] = useState<string | null>(null);
  const [testimonials, setTestimonials] = useState<TestimonialData[]>([]);

  const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql';

  const fetchTestimonials = useCallback(async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `query { testimonials(activeOnly: false) { id authorName authorRole content imageUrl isActive } }`,
      }),
    });
    const result = await res.json();
    if (result.data?.testimonials) {
      setTestimonials(result.data.testimonials);
    }
  }, [graphqlUrl]);

  useEffect(() => {
    fetchTestimonials();
  }, [fetchTestimonials]);

  const handleCreateEvent = (data: any) => {
    console.log('Creating event:', data);
    // In a real app, this would call an API to create the event
    alert('Event created! (This is a prototype - no backend yet)');
  };

  const handleEditEvent = (eventId: string) => {
    setEditingEventId(eventId);
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = (data: any) => {
    if (editingEventId) {
      console.log('Updating event:', editingEventId, data);
      alert('Event updated! (This is a prototype - no backend yet)');
    } else {
      handleCreateEvent(data);
    }
    setEditingEventId(null);
  };

  const handleDeleteEvent = (eventId: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      console.log('Deleting event:', eventId);
      alert('Event deleted! (This is a prototype - no backend yet)');
    }
  };

  // Sponsor handlers
  const handleCreateSponsor = (data: any) => {
    console.log('Creating sponsor:', data);
    alert('Sponsor added! (This is a prototype - no backend yet)');
  };

  const handleEditSponsor = (sponsorId: string) => {
    setEditingSponsorId(sponsorId);
    setIsSponsorModalOpen(true);
  };

  const handleSaveSponsor = (data: any) => {
    if (editingSponsorId) {
      console.log('Updating sponsor:', editingSponsorId, data);
      alert('Sponsor updated! (This is a prototype - no backend yet)');
    } else {
      handleCreateSponsor(data);
    }
    setEditingSponsorId(null);
  };

  const handleDeleteSponsor = (sponsorId: string) => {
    if (confirm('Are you sure you want to delete this sponsor?')) {
      console.log('Deleting sponsor:', sponsorId);
      alert('Sponsor deleted! (This is a prototype - no backend yet)');
    }
  };

  // Testimonial handlers
  const handleEditTestimonial = (testimonialId: string) => {
    setEditingTestimonialId(testimonialId);
    setIsTestimonialModalOpen(true);
  };

  const handleSaveTestimonial = async (data: any) => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    if (editingTestimonialId) {
      await fetch(graphqlUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: `mutation UpdateTestimonial($id: String!, $input: UpdateTestimonialInput!) {
            updateTestimonial(id: $id, input: $input) { id }
          }`,
          variables: {
            id: editingTestimonialId,
            input: {
              authorName: data.authorName,
              authorRole: data.authorRole || null,
              content: data.content,
              imageUrl: data.imageUrl || null,
            },
          },
        }),
      });
    } else {
      await fetch(graphqlUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: `mutation CreateTestimonial($input: CreateTestimonialInput!) {
            createTestimonial(input: $input) { id }
          }`,
          variables: {
            input: {
              authorName: data.authorName,
              authorRole: data.authorRole || null,
              content: data.content,
              imageUrl: data.imageUrl || null,
            },
          },
        }),
      });
    }

    setEditingTestimonialId(null);
    fetchTestimonials();
  };

  const handleDeleteTestimonial = async (testimonialId: string) => {
    if (!confirm('Are you sure you want to delete this testimonial?')) return;

    const token = localStorage.getItem('token');
    await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `mutation DeleteTestimonial($id: String!) {
          deleteTestimonial(id: $id)
        }`,
        variables: { id: testimonialId },
      }),
    });

    fetchTestimonials();
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Panel</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {['home', 'events', 'sponsors', 'testimonials'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Home Content */}
      {activeTab === 'home' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Mission Section</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content
                </label>
                <input
                  type="text"
                  className="input mb-3"
                  placeholder="Title"
                  defaultValue={mockHomeContent.mission.title}
                />
                <textarea
                  className="input"
                  rows={6}
                  placeholder="Mission content"
                  defaultValue={mockHomeContent.mission.content}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mission Image
                </label>
                <div className="mb-3">
                  <img
                    src={mockHomeContent.mission.imageUrl}
                    alt="Mission section preview"
                    className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                  />
                </div>
                <input
                  type="text"
                  className="input mb-2"
                  placeholder="Image URL"
                  defaultValue={mockHomeContent.mission.imageUrl}
                />
                <div className="flex gap-2">
                  <label className="btn-secondary text-sm cursor-pointer flex-1 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          alert('In production, this would upload to cloud storage. For now, use the Image URL field above.');
                        }
                      }}
                    />
                    📁 Upload Image
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Upload a new image or paste an image URL above
                </p>
              </div>
            </div>
            <button className="btn-primary mt-4">Save Changes</button>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">About / Join Section</h3>
            <input
              type="text"
              className="input mb-3"
              placeholder="Title"
              defaultValue={mockHomeContent.about.title}
            />
            <textarea
              className="input"
              rows={4}
              placeholder="Content"
              defaultValue={mockHomeContent.about.content}
            />
            <button className="btn-primary mt-4">Save Changes</button>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Activities Section Image</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image Preview
                </label>
                <img
                  src={mockHomeContent.activitiesImageUrl}
                  alt="Activities section preview"
                  className="w-full h-64 object-cover rounded-lg border-2 border-gray-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image URL
                </label>
                <input
                  type="text"
                  className="input mb-2"
                  placeholder="Image URL"
                  defaultValue={mockHomeContent.activitiesImageUrl}
                />
                <div className="flex gap-2 mb-4">
                  <label className="btn-secondary text-sm cursor-pointer flex-1 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          alert('In production, this would upload to cloud storage. For now, use the Image URL field above.');
                        }
                      }}
                    />
                    📁 Upload Image
                  </label>
                </div>
                <p className="text-xs text-gray-500">
                  This image appears in the "Hands-On Learning" section on the home page
                </p>
              </div>
            </div>
            <button className="btn-primary mt-4">Save Changes</button>
          </div>
        </div>
      )}

      {/* Events */}
      {activeTab === 'events' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Manage Events</h3>
            <button onClick={() => setIsEventModalOpen(true)} className="btn-primary">
              + Add Event
            </button>
          </div>
          <div className="space-y-4">
            {mockEvents.map((event) => (
              <div key={event.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-lg">{event.title}</h4>
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        event.eventType === 'internal'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {event.eventType === 'internal' ? '📍 Internal' : '🔗 External'}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        event.visibility === 'PUBLIC'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {event.visibility === 'PUBLIC' ? '🌐 Public' : '🔒 Members'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                      <div>
                        <span className="font-medium">📅 Date:</span> {format(event.startTime, 'MMM d, yyyy')}
                      </div>
                      <div>
                        <span className="font-medium">⏰ Time:</span> {format(event.startTime, 'h:mm a')} - {format(event.endTime, 'h:mm a')}
                      </div>
                      <div>
                        <span className="font-medium">📍 Location:</span> {event.location}
                      </div>
                      <div>
                        <span className="font-medium">👥 RSVPs:</span> {event.registrationCount}
                      </div>
                    </div>
                    {event.eventType === 'external' && event.externalRegistrationUrl && (
                      <div className="mt-2 text-sm">
                        <span className="font-medium">🔗 Registration:</span>{' '}
                        <a
                          href={event.externalRegistrationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-700 underline"
                        >
                          {event.externalRegistrationUrl}
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col space-y-2 ml-4">
                    <button
                      onClick={() => handleEditEvent(event.id)}
                      className="btn-secondary text-sm whitespace-nowrap"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="btn-secondary text-sm text-red-600 whitespace-nowrap"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event Modal */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setEditingEventId(null);
        }}
        onSave={handleSaveEvent}
        mode={editingEventId ? 'edit' : 'create'}
      />

      {/* Sponsor Modal */}
      <SponsorModal
        isOpen={isSponsorModalOpen}
        onClose={() => {
          setIsSponsorModalOpen(false);
          setEditingSponsorId(null);
        }}
        onSave={handleSaveSponsor}
        mode={editingSponsorId ? 'edit' : 'create'}
      />

      {/* Testimonial Modal */}
      <TestimonialModal
        isOpen={isTestimonialModalOpen}
        onClose={() => {
          setIsTestimonialModalOpen(false);
          setEditingTestimonialId(null);
        }}
        onSave={handleSaveTestimonial}
        mode={editingTestimonialId ? 'edit' : 'create'}
        initialData={editingTestimonialId ? testimonials.find((t) => t.id === editingTestimonialId) : undefined}
      />

      {/* Sponsors */}
      {activeTab === 'sponsors' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Manage Sponsors</h3>
            <button onClick={() => setIsSponsorModalOpen(true)} className="btn-primary">
              + Add Sponsor
            </button>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {mockSponsors.map((sponsor) => (
              <div key={sponsor.id} className="card">
                <div className="flex items-center justify-between mb-4">
                  <img src={sponsor.logoUrl} alt={sponsor.name} className="h-12" />
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditSponsor(sponsor.id)}
                      className="btn-secondary text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSponsor(sponsor.id)}
                      className="btn-secondary text-sm text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="font-semibold">{sponsor.name}</p>
                <p className="text-sm text-gray-600 mt-1">{sponsor.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Testimonials */}
      {activeTab === 'testimonials' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Manage Testimonials</h3>
            <button onClick={() => setIsTestimonialModalOpen(true)} className="btn-primary">
              + Add Testimonial
            </button>
          </div>
          {testimonials.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No testimonials yet. Add one above.</p>
          ) : (
            <div className="space-y-4">
              {testimonials.map((testimonial) => (
                <div key={testimonial.id} className={`card ${!testimonial.isActive ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start">
                      {testimonial.imageUrl && (
                        <img
                          src={testimonial.imageUrl}
                          alt={testimonial.authorName}
                          className="w-12 h-12 rounded-full mr-4"
                        />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{testimonial.authorName}</p>
                          {!testimonial.isActive && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              Hidden
                            </span>
                          )}
                        </div>
                        {testimonial.authorRole && (
                          <p className="text-sm text-gray-500">{testimonial.authorRole}</p>
                        )}
                        <p className="text-gray-700 mt-2 italic">"{testimonial.content}"</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditTestimonial(testimonial.id)}
                        className="btn-secondary text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTestimonial(testimonial.id)}
                        className="btn-secondary text-sm text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
