import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

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

const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql';

function authFetch(query: string) {
  const token = localStorage.getItem('token');
  return fetch(graphqlUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query }),
  }).then((res) => res.json());
}

export default function DashboardPage() {
  const [upcomingEvents, setUpcomingEvents] = useState<DashboardEvent[]>([]);
  const [recentPosts, setRecentPosts] = useState<DashboardPost[]>([]);
  const [memberCount, setMemberCount] = useState(0);

  useEffect(() => {
    // Fetch upcoming events (future only, sorted by date)
    authFetch(`query { events(publicOnly: false) { id title startTime location } }`)
      .then((result) => {
        if (result.data?.events) {
          const now = new Date().toISOString();
          const upcoming = result.data.events
            .filter((e: DashboardEvent) => e.startTime > now)
            .sort((a: DashboardEvent, b: DashboardEvent) => a.startTime.localeCompare(b.startTime))
            .slice(0, 5);
          setUpcomingEvents(upcoming);
        }
      })
      .catch(() => {});

    // Fetch recent social feed posts
    authFetch(`query { posts { id content createdAt author { firstName lastName } } }`)
      .then((result) => {
        if (result.data?.posts) {
          const sorted = [...result.data.posts]
            .sort((a: DashboardPost, b: DashboardPost) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, 5);
          setRecentPosts(sorted);
        }
      })
      .catch(() => {});

    // Fetch member count
    authFetch(`query { users { id } }`)
      .then((result) => {
        if (result.data?.users) {
          setMemberCount(result.data.users.length);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link to="/events" className="card hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold mb-2">Upcoming Events</h3>
          <p className="text-3xl font-bold text-primary-600">{upcomingEvents.length}</p>
        </Link>
        <Link to="/feed" className="card hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold mb-2">Recent Posts</h3>
          <p className="text-3xl font-bold text-primary-600">{recentPosts.length}</p>
        </Link>
        <Link to="/members" className="card hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold mb-2">Members</h3>
          <p className="text-3xl font-bold text-primary-600">{memberCount}</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                    <span>{format(new Date(event.startTime), 'MMM d, yyyy h:mm a')}</span>
                    {event.location && <span>{event.location}</span>}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {recentPosts.length === 0 ? (
              <p className="text-gray-500 text-sm">No recent posts.</p>
            ) : (
              recentPosts.map((post) => (
                <div key={post.id} className="border-b pb-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm">
                      <span className="font-semibold">{post.author.firstName} {post.author.lastName}</span> posted
                    </p>
                    <span className="text-xs text-gray-400">{format(new Date(post.createdAt), 'MMM d')}</span>
                  </div>
                  <p className="text-gray-600 text-sm mt-1">
                    {post.content.length > 100 ? post.content.substring(0, 100) + '...' : post.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
