import { format } from 'date-fns';
import DOMPurify from 'dompurify';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { authFetch } from '../utils/authFetch';
import { parseEventDate } from '../utils/dateUtils';

function stripHtml(html: string): string {
  const clean = DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
  return clean.replace(/&nbsp;/g, ' ').trim();
}

interface DashboardEvent {
  id: string;
  title: string;
  startTime: string;
  location?: string;
}

interface DashboardPost {
  id: string;
  content: string;
  createdAt: string;
  author: {
    firstName: string;
    lastName: string;
  };
}

const PAGE_SIZE = 5;

export default function DashboardPage() {
  const [upcomingEvents, setUpcomingEvents] = useState<DashboardEvent[]>([]);
  const [allPosts, setAllPosts] = useState<DashboardPost[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalToShow, setTotalToShow] = useState(PAGE_SIZE);
  const [lastVisit, setLastVisit] = useState<string | null>(null);

  useEffect(() => {
    // Track last dashboard visit for "new" indicators
    const stored = localStorage.getItem('lastDashboardVisit');
    setLastVisit(stored);
    localStorage.setItem('lastDashboardVisit', new Date().toISOString());

    Promise.all([
      authFetch(`query { events(publicOnly: false) { id title startTime location } }`),
      authFetch(`query { posts { id content createdAt author { firstName lastName } } }`),
      authFetch(`query { users { id } }`),
    ])
      .then(([eventsResult, postsResult, usersResult]) => {
        if (eventsResult.data?.events) {
          const now = new Date().toISOString();
          const upcoming = eventsResult.data.events
            .filter((e: DashboardEvent) => e.startTime > now)
            .sort((a: DashboardEvent, b: DashboardEvent) => a.startTime.localeCompare(b.startTime))
            .slice(0, 5);
          setUpcomingEvents(upcoming);
        }

        if (postsResult.data?.posts) {
          const sorted = [...postsResult.data.posts]
            .sort((a: DashboardPost, b: DashboardPost) => b.createdAt.localeCompare(a.createdAt));
          setAllPosts(sorted);

          if (stored) {
            const newCount = sorted.filter((p: DashboardPost) => p.createdAt > stored).length;
            setTotalToShow(Math.max(PAGE_SIZE, newCount));
          }
        }

        if (usersResult.data?.users) {
          setMemberCount(usersResult.data.users.length);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const displayPosts = allPosts.slice(0, totalToShow);
  const totalPages = Math.ceil(displayPosts.length / PAGE_SIZE);
  const visiblePosts = displayPosts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const newCount = lastVisit ? allPosts.filter(p => p.createdAt > lastVisit).length : 0;

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-8">Dashboard</h1>
        <p className="text-gray-500 text-center py-12">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-8">
        <Link to="/events" className="card hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold mb-2">Upcoming Events</h3>
          <p className="text-3xl font-bold text-primary-600">{upcomingEvents.length}</p>
        </Link>
        <Link to="/feed" className="card hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold mb-2">Recent Posts</h3>
          <p className="text-3xl font-bold text-primary-600">{allPosts.length}</p>
          {newCount > 0 && <p className="text-sm text-primary-500 mt-1">{newCount} new</p>}
        </Link>
        <Link to="/members" className="card hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold mb-2">Members</h3>
          <p className="text-3xl font-bold text-primary-600">{memberCount}</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Upcoming Events</h2>
          <div className="space-y-4">
            {upcomingEvents.length === 0 ? (
              <p className="text-gray-500 text-sm">No upcoming events.</p>
            ) : (
              upcomingEvents.map((event) => (
                <Link key={event.id} to={`/events/${event.id}`} className="block hover:bg-gray-50 p-2 rounded">
                  <p className="font-semibold">{event.title}</p>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span>{format(parseEventDate(event.startTime), 'MMM d, yyyy h:mm a')}</span>
                    {event.location && <span>{event.location}</span>}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Recent Activity</h2>
            {newCount > 0 && (
              <span className="text-xs font-medium bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                {newCount} new
              </span>
            )}
          </div>
          <div className="space-y-4">
            {visiblePosts.length === 0 ? (
              <p className="text-gray-500 text-sm">No recent posts.</p>
            ) : (
              visiblePosts.map((post) => {
                const isNew = lastVisit ? post.createdAt > lastVisit : false;
                return (
                  <Link key={post.id} to={`/feed#post-${post.id}`} className="block border-b pb-2 hover:bg-gray-50 rounded p-2 -mx-2 transition-colors">
                    <div className="flex items-center justify-between">
                      <p className="text-sm">
                        {isNew && <span className="inline-block w-2 h-2 bg-primary-500 rounded-full mr-1.5 align-middle" />}
                        <span className="font-semibold">{post.author.firstName} {post.author.lastName}</span> posted
                      </p>
                      <span className="text-xs text-gray-400">{format(new Date(post.createdAt), 'MMM d')}</span>
                    </div>
                    <p className="text-gray-600 text-sm mt-1">
                      {(() => { const text = stripHtml(post.content); return text.length > 100 ? text.substring(0, 100) + '...' : text; })()}
                    </p>
                  </Link>
                );
              })
            )}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 0}
                className="text-sm text-primary-600 hover:text-primary-800 disabled:text-gray-300 disabled:cursor-not-allowed"
              >
                Newer
              </button>
              <span className="text-xs text-gray-400">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= totalPages - 1}
                className="text-sm text-primary-600 hover:text-primary-800 disabled:text-gray-300 disabled:cursor-not-allowed"
              >
                Older
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
