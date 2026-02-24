import DOMPurify from 'dompurify';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { parseEventDate } from '../utils/dateUtils';
import { formatDescription } from '../utils/formatDescription';
import {
  mockHomeContent,
} from '../data/mockData';

interface HomeEventData {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location?: string;
  registrationCount: number;
}

interface TestimonialData {
  id: string;
  authorName: string;
  authorRole?: string;
  content: string;
  imageUrl?: string;
}

interface HomeSponsorData {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl?: string;
}

interface HomeBlogPostData {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  featuredImageUrl?: string;
  publishedAt?: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface HomeContentSection {
  sectionType: string;
  title: string;
  content: string;
  imageUrl: string;
  metadata: Record<string, string> | null;
}

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [testimonials, setTestimonials] = useState<TestimonialData[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<HomeEventData[]>([]);
  const [recentPosts, setRecentPosts] = useState<HomeBlogPostData[]>([]);
  const [sponsors, setSponsors] = useState<HomeSponsorData[]>([]);
  const [homeContent, setHomeContent] = useState<Record<string, HomeContentSection>>({});

  const hc = (sectionType: string, field: 'title' | 'content' | 'imageUrl', fallback: string): string => {
    return homeContent[sectionType]?.[field] || fallback;
  };
  const hcMeta = (sectionType: string, key: string, fallback: string): string => {
    return homeContent[sectionType]?.metadata?.[key] || fallback;
  };

  // Convert lh3.googleusercontent.com URLs to backend proxy (fixes broken Drive images)
  const proxyDriveUrl = (url: string): string => {
    const lh3Match = url.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
    if (lh3Match) {
      const apiBase = import.meta.env.VITE_GRAPHQL_URL?.replace('/graphql', '') || 'http://localhost:4000';
      return `${apiBase}/api/drive-image/${lh3Match[1]}`;
    }
    return url;
  };

  useEffect(() => {
    const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql';

    fetch(graphqlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query { testimonials(activeOnly: true) { id authorName authorRole content imageUrl } }`,
      }),
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.data?.testimonials) {
          setTestimonials(result.data.testimonials);
        }
      })
      .catch(() => {});

    fetch(graphqlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query { events(publicOnly: true) { id title description startTime endTime location registrationCount } }`,
      }),
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.data?.events) {
          setUpcomingEvents(result.data.events.slice(0, 3));
        }
      })
      .catch(() => {});

    fetch(graphqlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query { blogPosts(publicOnly: true) { id title slug excerpt featuredImageUrl publishedAt author { id firstName lastName } } }`,
      }),
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.data?.blogPosts) {
          setRecentPosts(result.data.blogPosts.slice(0, 3));
        }
      })
      .catch(() => {});

    fetch(graphqlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query { sponsors(activeOnly: true) { id name logoUrl websiteUrl } }`,
      }),
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.data?.sponsors) {
          setSponsors(result.data.sponsors);
        }
      })
      .catch(() => {});

    fetch(graphqlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query { homePageContent { sectionType title content imageUrl metadata } }`,
      }),
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.data?.homePageContent) {
          const contentMap: Record<string, HomeContentSection> = {};
          for (const section of result.data.homePageContent) {
            contentMap[section.sectionType] = {
              sectionType: section.sectionType,
              title: section.title || '',
              content: section.content || '',
              imageUrl: section.imageUrl || '',
              metadata: section.metadata || null,
            };
          }
          setHomeContent(contentMap);
        }
      })
      .catch(() => {});
  }, []);

  // If user has a valid session (e.g. Remember Me cookie), send them straight to the dashboard
  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative hero-bg min-h-[30vh] max-h-[40vh] flex items-center overflow-hidden rounded-2xl mx-4 sm:mx-6 lg:mx-8 mt-4">
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl tracking-tight font-extrabold text-white sm:text-4xl md:text-5xl">
              {hc('hero', 'title', 'Bibber Creek Spurs 4-H')}
            </h1>
            <p className="mt-3 text-gray-200 whitespace-nowrap text-[clamp(0.75rem,2vw,1.25rem)]">
              {hc('hero', 'content', 'Empowering youth through hands-on learning, leadership, and community engagement.')}
            </p>
            <div className="mt-4 md:mt-6 flex flex-wrap gap-2 md:gap-3 justify-center lg:justify-start">
              <Link
                to="/register"
                className="px-3 py-1.5 text-xs sm:text-sm md:px-5 md:py-2 md:text-base font-medium rounded-md text-primary-700 bg-white hover:bg-gray-100 shadow transition-colors"
              >
                Join Today
              </Link>
              <Link
                to="/events"
                className="px-3 py-1.5 text-xs sm:text-sm md:px-5 md:py-2 md:text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 shadow transition-colors"
              >
                View Events
              </Link>
              <Link
                to="/login"
                className="px-3 py-1.5 text-xs sm:text-sm md:px-5 md:py-2 md:text-base font-medium rounded-md text-white border border-white/40 hover:bg-white/10 transition-colors"
              >
                Member Login
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* About Our Club */}
      <div className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-5 lg:gap-12 lg:items-start">
            <div className="lg:col-span-3 mb-8 lg:mb-0">
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl mb-4">
                {hc('mission', 'title', mockHomeContent.mission.title)}
              </h2>
              <div
                className="prose prose-base text-gray-700 leading-relaxed mb-6 max-w-none"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(hc('mission', 'content', mockHomeContent.mission.content)) }}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {[
                  { type: 'program_area_1', icon: '🐴', title: 'Livestock & Animal Science', desc: 'Care and handling of horses and small animals' },
                  { type: 'program_area_2', icon: '🌱', title: 'Agriculture & Gardening', desc: 'Sustainable farming and hands-on projects' },
                  { type: 'program_area_3', icon: '⭐', title: 'Leadership Development', desc: 'Public speaking and community service' },
                ].map((area) => (
                  <div key={area.type} className="flex items-start gap-2">
                    <span className="text-xl">{hcMeta(area.type, 'icon', area.icon)}</span>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">{hc(area.type, 'title', area.title)}</h3>
                      <p className="text-gray-600 text-sm">{hc(area.type, 'content', area.desc)}</p>
                    </div>
                  </div>
                ))}
              </div>

            </div>
            <div className="lg:col-span-2">
              <img
                src={hc('mission', 'imageUrl', mockHomeContent.mission.imageUrl)}
                alt="Young 4-H members interacting with a miniature horse, learning about animal care"
                className="rounded-lg shadow-xl w-full h-auto object-cover max-h-96"
              />
            </div>
          </div>

          <div className="mt-10 max-w-4xl mx-auto">
            <div className="bg-white rounded-xl p-8 sm:p-10 shadow-lg text-center">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-4">
                {hc('join_club', 'title', mockHomeContent.about.title)}
              </h3>
              <div
                className="prose prose-lg text-gray-700 leading-relaxed max-w-none mx-auto"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(hc('join_club', 'content', mockHomeContent.about.content)) }}
              />
              <div className="mt-6">
                <Link to="/register" className="inline-flex items-center justify-center px-6 py-3 text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 shadow transition-colors">
                  Join Our Club
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div className="py-12 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                Upcoming Events
              </h2>
              <p className="mt-3 max-w-2xl text-xl text-gray-500 mx-auto">
                Join us for exciting activities and learning opportunities
              </p>
            </div>

            <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {upcomingEvents.map((event) => (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className="card hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                      {format(parseEventDate(event.startTime), 'MMM d, yyyy')}
                    </span>
                    <span className="text-sm text-gray-500">
                      {event.registrationCount} registered
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
                  <div className="prose prose-sm max-w-none text-gray-600 mb-4 line-clamp-3" dangerouslySetInnerHTML={{ __html: formatDescription(event.description) }} />
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="mr-4">📍 {event.location}</span>
                    <span>⏰ {format(parseEventDate(event.startTime), 'h:mm a')}</span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link to="/events" className="btn-primary">
                View All Events
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Blog Posts */}
      {recentPosts.length > 0 && (
        <div className="py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Latest Stories</h2>
              <p className="mt-3 max-w-2xl text-xl text-gray-500 mx-auto">
                Read about our members' experiences and achievements
              </p>
            </div>

            <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {recentPosts.map((post) => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="group">
                  {post.featuredImageUrl && (
                    <div className="relative h-48 bg-gray-300 rounded-lg overflow-hidden">
                      <img
                        src={post.featuredImageUrl}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="mt-4">
                    <div className="flex items-center text-sm text-gray-500 mb-2">
                      <span>{post.author.firstName} {post.author.lastName}</span>
                      {post.publishedAt && (
                        <>
                          <span className="mx-2">&bull;</span>
                          <span>{format(new Date(post.publishedAt), 'MMM d, yyyy')}</span>
                        </>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                      {post.title}
                    </h3>
                    {post.excerpt && <p className="mt-2 text-gray-600">{post.excerpt}</p>}
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link to="/blog" className="btn-primary">
                Read More Stories
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <div className="py-12 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                What People Are Saying
              </h2>
            </div>

            <div className="mt-8 grid gap-8 md:grid-cols-2">
              {testimonials.map((testimonial) => (
                <div key={testimonial.id} className="card">
                  <div className="flex items-center mb-4">
                    {testimonial.imageUrl && (
                      <img
                        src={testimonial.imageUrl}
                        alt={testimonial.authorName}
                        className="w-12 h-12 rounded-full mr-4"
                      />
                    )}
                    <div>
                      <p className="font-bold text-gray-900">{testimonial.authorName}</p>
                      {testimonial.authorRole && (
                        <p className="text-sm text-gray-500">{testimonial.authorRole}</p>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-700 italic">"{testimonial.content}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sponsors */}
      {sponsors.length > 0 && (
        <div className="py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Our Sponsors</h2>
              <p className="mt-3 max-w-2xl text-xl text-gray-500 mx-auto">
                Thank you to our generous supporters
              </p>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-8 md:grid-cols-4">
              {sponsors.map((sponsor) => (
                <a
                  key={sponsor.id}
                  href={sponsor.websiteUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center p-6 bg-white rounded-lg hover:shadow-md transition-shadow"
                >
                  <img
                    src={proxyDriveUrl(sponsor.logoUrl)}
                    alt={sponsor.name}
                    className="max-h-16 object-contain"
                    referrerPolicy="no-referrer"
                  />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CTA Section */}
      <div className="bg-primary-600">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:py-10 lg:px-8 lg:flex lg:items-center lg:justify-between">
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            <span className="block">{hc('cta_banner', 'title', 'Ready to get started?')}</span>
            <span className="block text-primary-200 text-lg sm:text-xl font-medium">{hc('cta_banner', 'content', 'Join our 4-H family today.')}</span>
          </h2>
          <div className="mt-6 flex lg:mt-0 lg:flex-shrink-0">
            <div className="inline-flex rounded-md shadow">
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-600 bg-white hover:bg-gray-50"
              >
                {hcMeta('cta_banner', 'buttonText', 'Become a Member')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
