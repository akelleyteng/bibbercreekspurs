import { Link } from 'react-router-dom';
import {
  mockEvents,
  mockBlogPosts,
  mockSponsors,
  mockTestimonials,
  mockHomeContent,
} from '../data/mockData';
import { format } from 'date-fns';

export default function HomePage() {
  const upcomingEvents = mockEvents.filter((e) => e.visibility === 'PUBLIC').slice(0, 3);
  const recentPosts = mockBlogPosts.filter((p) => p.visibility === 'PUBLIC').slice(0, 3);

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative bg-primary-600 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 sm:pb-16 md:pb-20 lg:pb-28 xl:pb-32">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="text-center">
                <h1 className="text-4xl tracking-tight font-extrabold text-white sm:text-5xl md:text-6xl">
                  <span className="block">Welcome to</span>
                  <span className="block">Bibber Creek Spurs 4-H</span>
                </h1>
                <p className="mt-3 max-w-md mx-auto text-base text-primary-100 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
                  Empowering youth through hands-on learning, leadership development, and community
                  engagement. Join us and discover your potential!
                </p>
                <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
                  <div className="rounded-md shadow">
                    <Link
                      to="/register"
                      className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-primary-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
                    >
                      Join Today
                    </Link>
                  </div>
                  <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
                    <Link
                      to="/events"
                      className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-700 hover:bg-primary-800 md:py-4 md:text-lg md:px-10"
                    >
                      View Events
                    </Link>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* Mission Section with Image */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-5 lg:gap-12 lg:items-start">
            <div className="lg:col-span-3 mb-8 lg:mb-0">
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl mb-6">
                {mockHomeContent.mission.title}
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                {mockHomeContent.mission.content}
              </p>
              <div className="bg-white rounded-lg p-6 shadow-md">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {mockHomeContent.about.title}
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {mockHomeContent.about.content}
                </p>
                <div className="mt-6">
                  <Link to="/register" className="btn-primary">
                    Join Our Club
                  </Link>
                </div>
              </div>
            </div>
            <div className="lg:col-span-2">
              <img
                src={mockHomeContent.mission.imageUrl}
                alt="Young 4-H members interacting with a miniature horse, learning about animal care"
                className="rounded-lg shadow-xl w-full h-auto object-cover max-h-96"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Activities Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:items-start">
            <div className="order-2 lg:order-1 relative mb-8 lg:mb-0">
              <img
                src={mockHomeContent.activitiesImageUrl}
                alt="4-H member training with a horse in an indoor arena, demonstrating leadership and horsemanship skills"
                className="rounded-lg shadow-xl w-full h-auto object-cover max-h-96"
              />
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl mb-6">
                Hands-On Learning
              </h2>
              <p className="text-xl text-gray-500 leading-relaxed mb-6">
                Through our diverse programs, members develop essential life skills including leadership,
                responsibility, and teamwork. From animal care to public speaking, every activity is
                designed to help youth discover their passions and build confidence.
              </p>
              <div className="space-y-4">
                <div className="flex items-start">
                  <span className="text-2xl mr-3">🐴</span>
                  <div>
                    <h3 className="font-bold text-gray-900">Livestock & Animal Science</h3>
                    <p className="text-gray-600">Learn proper care and handling of horses, cattle, and small animals</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="text-2xl mr-3">🌱</span>
                  <div>
                    <h3 className="font-bold text-gray-900">Agriculture & Gardening</h3>
                    <p className="text-gray-600">Explore sustainable farming and grow your own projects</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="text-2xl mr-3">⭐</span>
                  <div>
                    <h3 className="font-bold text-gray-900">Leadership Development</h3>
                    <p className="text-gray-600">Build confidence through public speaking and community service</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Upcoming Events
            </h2>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
              Join us for exciting activities and learning opportunities
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map((event) => (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className="card hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                    {format(event.startTime, 'MMM d, yyyy')}
                  </span>
                  <span className="text-sm text-gray-500">
                    {event.registrationCount} registered
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
                <p className="text-gray-600 mb-4">{event.description}</p>
                <div className="flex items-center text-sm text-gray-500">
                  <span className="mr-4">📍 {event.location}</span>
                  <span>⏰ {format(event.startTime, 'h:mm a')}</span>
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

      {/* Blog Posts */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Latest Stories</h2>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
              Read about our members' experiences and achievements
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {recentPosts.map((post) => (
              <Link key={post.id} to={`/blog/${post.slug}`} className="group">
                <div className="relative h-48 bg-gray-300 rounded-lg overflow-hidden">
                  <img
                    src={post.featuredImageUrl}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="mt-4">
                  <div className="flex items-center text-sm text-gray-500 mb-2">
                    <span>{post.author.firstName} {post.author.lastName}</span>
                    <span className="mx-2">•</span>
                    <span>{format(post.publishedAt!, 'MMM d, yyyy')}</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                    {post.title}
                  </h3>
                  <p className="mt-2 text-gray-600">{post.excerpt}</p>
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

      {/* Testimonials */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              What People Are Saying
            </h2>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {mockTestimonials.map((testimonial) => (
              <div key={testimonial.id} className="card">
                <div className="flex items-center mb-4">
                  <img
                    src={testimonial.imageUrl!}
                    alt={testimonial.authorName}
                    className="w-12 h-12 rounded-full mr-4"
                  />
                  <div>
                    <p className="font-bold text-gray-900">{testimonial.authorName}</p>
                    <p className="text-sm text-gray-500">{testimonial.authorRole}</p>
                  </div>
                </div>
                <p className="text-gray-700 italic">"{testimonial.content}"</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sponsors */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Our Sponsors</h2>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
              Thank you to our generous supporters
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-8 md:grid-cols-4">
            {mockSponsors.map((sponsor) => (
              <a
                key={sponsor.id}
                href={sponsor.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center p-6 bg-white rounded-lg hover:shadow-md transition-shadow"
              >
                <img src={sponsor.logoUrl} alt={sponsor.name} className="max-h-16" />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary-600">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            <span className="block">Ready to get started?</span>
            <span className="block text-primary-200">Join our 4-H family today.</span>
          </h2>
          <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
            <div className="inline-flex rounded-md shadow">
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-primary-600 bg-white hover:bg-gray-50"
              >
                Become a Member
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
