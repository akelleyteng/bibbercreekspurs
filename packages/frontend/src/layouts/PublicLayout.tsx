import { Outlet, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function PublicLayout() {
  const { itemCount, openDrawer } = useCart();
  return (
    <div className="min-h-screen flex flex-col">
      {/* Skip to main content for keyboard navigation */}
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>

      {/* Header */}
      <header className="bg-white shadow-sm" role="banner">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link to="/" className="flex items-center" aria-label="Bibber Creek Spurs 4-H Home">
                <span className="text-2xl font-bold text-primary-600" aria-hidden="true">🍀</span>
                <span className="text-2xl font-bold text-primary-600 ml-2">Bibber Creek Spurs 4-H</span>
              </Link>
              <div className="hidden sm:ml-8 sm:flex sm:space-x-8" role="navigation">
                <Link
                  to="/"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-primary-600"
                  aria-label="Home page"
                >
                  Home
                </Link>
                <Link
                  to="/events"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-primary-600"
                  aria-label="View events"
                >
                  Events
                </Link>
                <Link
                  to="/blog"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-primary-600"
                  aria-label="Read blog posts"
                >
                  Blog
                </Link>
                <Link
                  to="/shop"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-primary-600"
                  aria-label="Browse club shop"
                >
                  Shop
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Cart Icon */}
              <button
                onClick={openDrawer}
                className="relative text-gray-500 hover:text-gray-700"
                aria-label="Open cart"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                {itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-primary-600 rounded-full">
                    {itemCount}
                  </span>
                )}
              </button>
              <Link
                to="/login"
                className="text-gray-700 hover:text-primary-600 font-medium"
                aria-label="Member login"
              >
                Login
              </Link>
              <Link to="/register" className="btn-primary" aria-label="Join 4-H Club">
                Join 4-H
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main id="main-content" className="flex-grow" role="main">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white mt-12" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4">Bibber Creek Spurs 4-H</h3>
              <p className="text-gray-300">
                Empowering youth through hands-on learning and community engagement.
              </p>
            </div>
            <nav aria-label="Footer navigation">
              <h3 className="text-lg font-bold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/events" className="text-gray-300 hover:text-white focus:text-white">
                    Events
                  </Link>
                </li>
                <li>
                  <Link to="/blog" className="text-gray-300 hover:text-white focus:text-white">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link to="/shop" className="text-gray-300 hover:text-white focus:text-white">
                    Shop
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="text-gray-300 hover:text-white focus:text-white">
                    Join Us
                  </Link>
                </li>
              </ul>
            </nav>
            <div>
              <h3 className="text-lg font-bold mb-4">Contact</h3>
              <address className="text-gray-300 not-italic">
                <p>
                  <a href="mailto:info@bibbercreekspurs4h.org" className="hover:text-white focus:text-white">
                    info@bibbercreekspurs4h.org
                  </a>
                </p>
              </address>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400">
            <p>&copy; 2026 Bibber Creek Spurs 4-H Club. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
