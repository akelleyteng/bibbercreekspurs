import { format } from 'date-fns';
import { useState, useEffect, useCallback } from 'react';

import BlogPostModal from '../components/BlogPostModal';
import EventModal from '../components/EventModal';
import SponsorModal from '../components/SponsorModal';
import TestimonialModal from '../components/TestimonialModal';
import { mockHomeContent, mockSponsors } from '../data/mockData';

const OFFICER_POSITIONS = [
  { key: 'PRESIDENT', label: 'President', description: 'Presides over meetings, builds agendas, delegates tasks, and ensures order using parliamentary procedure.' },
  { key: 'VICE_PRESIDENT', label: 'Vice President', description: 'Fills in for the president, coordinates committees, and introduces guests.' },
  { key: 'SECRETARY', label: 'Secretary', description: 'Keeps accurate minutes of meetings, records attendance, and handles correspondence.' },
  { key: 'TREASURER', label: 'Treasurer', description: 'Manages club funds, keeps financial records, and reports on the budget.' },
  { key: 'SERGEANT_AT_ARMS', label: 'Sergeant-at-Arms', description: 'Maintains order and sets up the room.' },
  { key: 'NEWS_REPORTER', label: 'News Reporter', description: 'Writes articles about club activities for local media.' },
  { key: 'RECREATION_LEADER', label: 'Recreation/Song Leader', description: 'Leads games, icebreakers, and songs.' },
  { key: 'HISTORIAN', label: 'Historian', description: "Documents the club's year through photos and scrapbooks." },
];

interface OfficerData {
  id: string;
  position: string;
  termYear: string;
  holderUserId?: string;
  holderYouthMemberId?: string;
  holder?: { firstName: string; lastName: string; holderType: string; profilePhotoUrl?: string };
  label: string;
  description: string;
}

interface HolderOption {
  id: string;
  name: string;
  type: 'user' | 'youth';
}

interface EventData {
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
  creator: { id: string; firstName: string; lastName: string };
}

interface TestimonialData {
  id: string;
  authorName: string;
  authorRole?: string;
  content: string;
  imageUrl?: string;
  isActive: boolean;
}

interface BlogPostData {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  visibility: string;
  featuredImageUrl?: string;
  publishedAt?: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'home' | 'events' | 'blog' | 'sponsors' | 'testimonials' | 'officers'>('home');
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [officers, setOfficers] = useState<OfficerData[]>([]);
  const [termYear, setTermYear] = useState(() => {
    const now = new Date();
    const year = now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1;
    return `${year}-${year + 1}`;
  });
  const [holderOptions, setHolderOptions] = useState<HolderOption[]>([]);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [isBlogModalOpen, setIsBlogModalOpen] = useState(false);
  const [editingBlogPostId, setEditingBlogPostId] = useState<string | null>(null);
  const [isSponsorModalOpen, setIsSponsorModalOpen] = useState(false);
  const [editingSponsorId, setEditingSponsorId] = useState<string | null>(null);
  const [isTestimonialModalOpen, setIsTestimonialModalOpen] = useState(false);
  const [editingTestimonialId, setEditingTestimonialId] = useState<string | null>(null);
  const [testimonials, setTestimonials] = useState<TestimonialData[]>([]);
  const [events, setEvents] = useState<EventData[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPostData[]>([]);

  const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql';

  const fetchEvents = useCallback(async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `query { events { id title description startTime endTime location visibility eventType externalRegistrationUrl imageUrl registrationCount creator { id firstName lastName } } }`,
      }),
    });
    const result = await res.json();
    if (result.data?.events) {
      setEvents(result.data.events);
    }
  }, [graphqlUrl]);

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

  const fetchBlogPosts = useCallback(async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `query { blogPosts(publicOnly: false) { id title slug content excerpt visibility featuredImageUrl publishedAt author { id firstName lastName } } }`,
      }),
    });
    const result = await res.json();
    if (result.data?.blogPosts) {
      setBlogPosts(result.data.blogPosts);
    }
  }, [graphqlUrl]);

  const fetchOfficers = useCallback(async (year: string) => {
    const token = localStorage.getItem('token');
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `query($termYear: String!) { officerPositions(termYear: $termYear) { id position termYear holderUserId holderYouthMemberId holder { firstName lastName holderType profilePhotoUrl } label description } }`,
        variables: { termYear: year },
      }),
    });
    const result = await res.json();
    if (result.data?.officerPositions) {
      setOfficers(result.data.officerPositions);
    }
  }, [graphqlUrl]);

  const fetchHolderOptions = useCallback(async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `query { users { id firstName lastName youthMembers { id firstName lastName } } }`,
      }),
    });
    const result = await res.json();
    if (result.data?.users) {
      const options: HolderOption[] = [];
      for (const user of result.data.users) {
        options.push({ id: user.id, name: `${user.firstName} ${user.lastName}`, type: 'user' });
        if (user.youthMembers) {
          for (const ym of user.youthMembers) {
            options.push({ id: ym.id, name: `${ym.firstName} ${ym.lastName} (Youth)`, type: 'youth' });
          }
        }
      }
      setHolderOptions(options);
    }
  }, [graphqlUrl]);

  useEffect(() => {
    fetchTestimonials();
    fetchEvents();
    fetchBlogPosts();
    fetchOfficers(termYear);
    fetchHolderOptions();
  }, [fetchTestimonials, fetchEvents, fetchBlogPosts, fetchOfficers, fetchHolderOptions, termYear]);

  const handleEditEvent = (eventId: string) => {
    setEditingEventId(eventId);
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = async (data: any) => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const startTime = new Date(`${data.startDate}T${data.startTime}`).toISOString();
    const endTime = new Date(`${data.endDate}T${data.endTime}`).toISOString();

    try {
      let res: Response;

      if (editingEventId) {
        res = await fetch(graphqlUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query: `mutation UpdateEvent($id: String!, $input: UpdateEventInput!) {
              updateEvent(id: $id, input: $input) { id }
            }`,
            variables: {
              id: editingEventId,
              input: {
                title: data.title,
                description: data.description,
                startTime,
                endTime,
                location: data.location || null,
                visibility: data.visibility,
                eventType: data.eventType,
                externalRegistrationUrl: data.externalRegistrationUrl || null,
                imageUrl: data.imageUrl || null,
                isRecurring: data.isRecurring || false,
                recurringFrequency: data.isRecurring ? data.recurringFrequency : null,
                recurringEndDate: data.isRecurring && data.recurringEndDate ? data.recurringEndDate : null,
                recurringDaysOfWeek: data.isRecurring && data.recurringDaysOfWeek?.length ? data.recurringDaysOfWeek : null,
                monthlyPattern: data.isRecurring && data.recurringFrequency === 'monthly' ? data.monthlyPattern : null,
                recurringInterval: data.isRecurring ? (data.recurringInterval || 1) : null,
                publishToGoogleCalendar: data.publishToGoogleCalendar || false,
                reminderMinutesBefore: data.publishToGoogleCalendar && data.reminderMinutesBefore?.length ? data.reminderMinutesBefore : null,
                reminderMethods: data.publishToGoogleCalendar && data.reminderMethods?.length ? data.reminderMethods : null,
              },
            },
          }),
        });
      } else {
        res = await fetch(graphqlUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query: `mutation CreateEvent($input: CreateEventInput!) {
              createEvent(input: $input) { id }
            }`,
            variables: {
              input: {
                title: data.title,
                description: data.description,
                startTime,
                endTime,
                location: data.location || null,
                visibility: data.visibility,
                eventType: data.eventType,
                externalRegistrationUrl: data.externalRegistrationUrl || null,
                imageUrl: data.imageUrl || null,
                isRecurring: data.isRecurring || false,
                recurringFrequency: data.isRecurring ? data.recurringFrequency : null,
                recurringEndDate: data.isRecurring && data.recurringEndDate ? data.recurringEndDate : null,
                recurringDaysOfWeek: data.isRecurring && data.recurringDaysOfWeek?.length ? data.recurringDaysOfWeek : null,
                monthlyPattern: data.isRecurring && data.recurringFrequency === 'monthly' ? data.monthlyPattern : null,
                recurringInterval: data.isRecurring ? (data.recurringInterval || 1) : null,
                publishToGoogleCalendar: data.publishToGoogleCalendar || false,
                reminderMinutesBefore: data.publishToGoogleCalendar && data.reminderMinutesBefore?.length ? data.reminderMinutesBefore : null,
                reminderMethods: data.publishToGoogleCalendar && data.reminderMethods?.length ? data.reminderMethods : null,
              },
            },
          }),
        });
      }

      const result = await res.json();
      if (result.errors) {
        alert(`Error saving event: ${result.errors[0]?.message || 'Unknown error'}`);
        return;
      }

      setEditingEventId(null);
      setIsEventModalOpen(false);
      fetchEvents();
    } catch (err) {
      alert('Network error: Could not save event. Please try again.');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    const token = localStorage.getItem('token');
    await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `mutation DeleteEvent($id: String!) {
          deleteEvent(id: $id)
        }`,
        variables: { id: eventId },
      }),
    });

    fetchEvents();
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

  // Officer handlers
  const handleSetOfficer = async (position: string, holderId: string, holderType: 'user' | 'youth') => {
    const token = localStorage.getItem('token');
    await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `mutation SetOfficer($position: String!, $termYear: String!, $holderUserId: String, $holderYouthMemberId: String) {
          setOfficer(position: $position, termYear: $termYear, holderUserId: $holderUserId, holderYouthMemberId: $holderYouthMemberId) { id }
        }`,
        variables: {
          position,
          termYear,
          holderUserId: holderType === 'user' ? holderId : null,
          holderYouthMemberId: holderType === 'youth' ? holderId : null,
        },
      }),
    });
    fetchOfficers(termYear);
  };

  const handleRemoveOfficer = async (position: string) => {
    if (!confirm('Remove this officer assignment?')) return;
    const token = localStorage.getItem('token');
    await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `mutation RemoveOfficer($position: String!, $termYear: String!) {
          removeOfficer(position: $position, termYear: $termYear)
        }`,
        variables: { position, termYear },
      }),
    });
    fetchOfficers(termYear);
  };

  // Blog handlers
  const handleEditBlogPost = (postId: string) => {
    setEditingBlogPostId(postId);
    setIsBlogModalOpen(true);
  };

  const handleSaveBlogPost = async (data: any) => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    if (editingBlogPostId) {
      await fetch(graphqlUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: `mutation UpdateBlogPost($id: String!, $input: UpdateBlogPostInput!) {
            updateBlogPost(id: $id, input: $input) { id }
          }`,
          variables: {
            id: editingBlogPostId,
            input: {
              title: data.title,
              content: data.content,
              excerpt: data.excerpt || null,
              visibility: data.visibility,
              featuredImageUrl: data.featuredImageUrl || null,
              publishedAt: data.publishedAt || null,
            },
          },
        }),
      });
    } else {
      await fetch(graphqlUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: `mutation CreateBlogPost($input: CreateBlogPostInput!) {
            createBlogPost(input: $input) { id }
          }`,
          variables: {
            input: {
              title: data.title,
              content: data.content,
              excerpt: data.excerpt || null,
              visibility: data.visibility,
              featuredImageUrl: data.featuredImageUrl || null,
              publishedAt: data.publishedAt || null,
            },
          },
        }),
      });
    }

    setEditingBlogPostId(null);
    fetchBlogPosts();
  };

  const handleDeleteBlogPost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this blog post?')) return;

    const token = localStorage.getItem('token');
    await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `mutation DeleteBlogPost($id: String!) {
          deleteBlogPost(id: $id)
        }`,
        variables: { id: postId },
      }),
    });

    fetchBlogPosts();
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Panel</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {['home', 'events', 'blog', 'sponsors', 'testimonials', 'officers'].map((tab) => (
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
          {events.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No events yet. Add one above.</p>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
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
                          <span className="font-medium">📅 Date:</span> {format(new Date(event.startTime), 'MMM d, yyyy')}
                        </div>
                        <div>
                          <span className="font-medium">⏰ Time:</span> {format(new Date(event.startTime), 'h:mm a')} - {format(new Date(event.endTime), 'h:mm a')}
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
          )}
        </div>
      )}

      {/* Blog */}
      {activeTab === 'blog' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Manage Blog Posts</h3>
            <button onClick={() => setIsBlogModalOpen(true)} className="btn-primary">
              + New Post
            </button>
          </div>
          {blogPosts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No blog posts yet. Create one above.</p>
          ) : (
            <div className="space-y-4">
              {blogPosts.map((post) => (
                <div key={post.id} className="card">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-lg">{post.title}</h4>
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          post.publishedAt
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {post.publishedAt ? 'Published' : 'Draft'}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          post.visibility === 'PUBLIC'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {post.visibility === 'PUBLIC' ? 'Public' : 'Members'}
                        </span>
                      </div>
                      {post.excerpt && (
                        <p className="text-sm text-gray-600 mb-2">{post.excerpt}</p>
                      )}
                      <div className="text-sm text-gray-500">
                        <span>By {post.author.firstName} {post.author.lastName}</span>
                        {post.publishedAt && (
                          <span className="ml-4">
                            Published {format(new Date(post.publishedAt), 'MMM d, yyyy')}
                          </span>
                        )}
                        <span className="ml-4">Slug: /{post.slug}</span>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2 ml-4">
                      <button
                        onClick={() => handleEditBlogPost(post.id)}
                        className="btn-secondary text-sm whitespace-nowrap"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteBlogPost(post.id)}
                        className="btn-secondary text-sm text-red-600 whitespace-nowrap"
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

      {/* Event Modal */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setEditingEventId(null);
        }}
        onSave={handleSaveEvent}
        mode={editingEventId ? 'edit' : 'create'}
        initialData={editingEventId ? (() => {
          const ev = events.find((e) => e.id === editingEventId);
          if (!ev) return undefined;
          const start = new Date(ev.startTime);
          const end = new Date(ev.endTime);
          return {
            title: ev.title,
            description: ev.description,
            startDate: format(start, 'yyyy-MM-dd'),
            startTime: format(start, 'HH:mm'),
            endDate: format(end, 'yyyy-MM-dd'),
            endTime: format(end, 'HH:mm'),
            location: ev.location || '',
            eventType: ev.eventType as 'internal' | 'external',
            visibility: ev.visibility as any,
            externalRegistrationUrl: ev.externalRegistrationUrl || '',
            imageUrl: ev.imageUrl || '',
          };
        })() : undefined}
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

      {/* Blog Post Modal */}
      <BlogPostModal
        isOpen={isBlogModalOpen}
        onClose={() => {
          setIsBlogModalOpen(false);
          setEditingBlogPostId(null);
        }}
        onSave={handleSaveBlogPost}
        mode={editingBlogPostId ? 'edit' : 'create'}
        initialData={editingBlogPostId ? (() => {
          const bp = blogPosts.find((p) => p.id === editingBlogPostId);
          if (!bp) return undefined;
          return {
            title: bp.title,
            content: bp.content,
            excerpt: bp.excerpt || '',
            visibility: bp.visibility as 'PUBLIC' | 'MEMBER_ONLY',
            featuredImageUrl: bp.featuredImageUrl || '',
            publishedAt: bp.publishedAt || '',
          };
        })() : undefined}
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

      {/* Officers */}
      {activeTab === 'officers' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Manage Officers</h3>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Term Year:</label>
              <select
                className="input w-auto"
                value={termYear}
                onChange={(e) => {
                  setTermYear(e.target.value);
                  fetchOfficers(e.target.value);
                }}
              >
                {(() => {
                  const now = new Date();
                  const currentYear = now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1;
                  const years = [];
                  for (let y = currentYear + 1; y >= currentYear - 3; y--) {
                    years.push(`${y}-${y + 1}`);
                  }
                  return years.map(y => <option key={y} value={y}>{y}</option>);
                })()}
              </select>
            </div>
          </div>
          <div className="space-y-4">
            {OFFICER_POSITIONS.map((pos) => {
              const assigned = officers.find(o => o.position === pos.key);
              return (
                <div key={pos.key} className="card">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold">{pos.label}</h4>
                      <p className="text-sm text-gray-500">{pos.description}</p>
                      {assigned?.holder ? (
                        <div className="mt-2 flex items-center gap-2">
                          <img
                            src={assigned.holder.profilePhotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(assigned.holder.firstName + ' ' + assigned.holder.lastName)}&background=4f772d&color=fff&size=32`}
                            alt=""
                            className="w-8 h-8 rounded-full"
                          />
                          <span className="text-sm font-medium text-gray-900">
                            {assigned.holder.firstName} {assigned.holder.lastName}
                          </span>
                          {assigned.holder.holderType === 'youth' && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">Youth</span>
                          )}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-gray-400 italic">Vacant</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <select
                        className="input w-auto text-sm"
                        value=""
                        onChange={(e) => {
                          const [type, id] = e.target.value.split(':');
                          if (type && id) {
                            handleSetOfficer(pos.key, id, type as 'user' | 'youth');
                          }
                        }}
                      >
                        <option value="">Assign...</option>
                        {holderOptions.map((opt) => (
                          <option key={`${opt.type}:${opt.id}`} value={`${opt.type}:${opt.id}`}>
                            {opt.name}
                          </option>
                        ))}
                      </select>
                      {assigned?.holder && (
                        <button
                          onClick={() => handleRemoveOfficer(pos.key)}
                          className="btn-secondary text-sm text-red-600"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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
