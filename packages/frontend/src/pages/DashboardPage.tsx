import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { mockPosts } from '../data/mockData';

interface DashboardEvent {
  id: string;
  title: string;
  startTime: string;
}

export default function DashboardPage() {
  const [upcomingEvents, setUpcomingEvents] = useState<DashboardEvent[]>([]);
  const recentPosts = mockPosts.slice(0, 2);

  useEffect(() => {
    const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql';
    const token = localStorage.getItem('token');
    fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `query { events { id title startTime } }`,
      }),
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.data?.events) {
          setUpcomingEvents(result.data.events.slice(0, 3));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Upcoming Events</h3>
          <p className="text-3xl font-bold text-primary-600">{upcomingEvents.length}</p>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">New Posts</h3>
          <p className="text-3xl font-bold text-primary-600">{recentPosts.length}</p>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Members</h3>
          <p className="text-3xl font-bold text-primary-600">24</p>
        </div>
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
                  <p className="text-sm text-gray-500">{format(new Date(event.startTime), 'MMM d, yyyy')}</p>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {recentPosts.map((post) => (
              <div key={post.id} className="border-b pb-2">
                <p className="text-sm">
                  <span className="font-semibold">{post.author.firstName}</span> posted
                </p>
                <p className="text-gray-600 text-sm mt-1">{post.content.substring(0, 80)}...</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
