import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';

import { useAuth } from '../context/AuthContext';

// Member layout with user menu dropdown (Profile/Help/Logout)
export default function MemberLayout() {
  const location = useLocation();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => {
    // Exact match
    if (location.pathname === path) return true;
    // Also check if we're on a detail page (e.g., /admin/events/123 matches /admin/events)
    if (location.pathname.startsWith(path + '/')) return true;
    return false;
  };

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // For admins, use admin routes for Events and Blog to keep sidebar
  const isAdmin = user.role === 'ADMIN';

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { name: 'Social Feed', href: '/feed', icon: '💬' },
    { name: 'Events', href: isAdmin ? '/admin/events' : '/events', icon: '📅' },
    { name: 'Calendar', href: '/calendar', icon: '🗓️' },
    { name: 'Blog', href: isAdmin ? '/admin/blog' : '/blog', icon: '📝' },
    { name: 'Members', href: '/members', icon: '👥' },
    { name: 'Officers', href: '/officers', icon: '⭐' },
    { name: 'Files', href: '/files', icon: '📁' },
  ];

  const adminNavigation = [{ name: 'Admin Panel', href: '/admin', icon: '⚙️' }];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Skip to main content for keyboard navigation */}
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>

      {/* Top Navigation */}
      <nav className="bg-white shadow-sm" role="navigation" aria-label="Top navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-primary-600" aria-label="Bibber Creek Spurs 4-H Home">
                <span aria-hidden="true">🍀</span> Bibber Creek Spurs 4-H
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700" aria-label="Current user">
                {user.firstName} {user.lastName}
              </span>

              {/* User Menu Dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-600 text-white font-bold hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  aria-label="User menu"
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                >
                  {user.firstName[0]}
                  {user.lastName[0]}
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50" data-menu="user" data-version="1.0">
                    <div className="py-1" role="menu" aria-orientation="vertical">
                      <Link
                        to="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        👤 Profile
                      </Link>
                      <Link
                        to="/help"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        ❓ Help
                      </Link>
                      <hr className="my-1 border-gray-200" />
                      <button
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                        onClick={async () => {
                          setIsUserMenuOpen(false);
                          await logout();
                        }}
                      >
                        🚪 Log Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-sm min-h-[calc(100vh-4rem)]" role="navigation" aria-label="Sidebar navigation">
          <nav className="px-4 py-6 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive(item.href)
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                aria-current={isActive(item.href) ? 'page' : undefined}
              >
                <span className="mr-3 text-lg" aria-hidden="true">{item.icon}</span>
                {item.name}
              </Link>
            ))}

            {/* Admin Section */}
            {user.role === 'ADMIN' && (
              <>
                <div className="pt-6 pb-2" role="separator">
                  <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Administration
                  </p>
                </div>
                {adminNavigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      isActive(item.href)
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                  >
                    <span className="mr-3 text-lg" aria-hidden="true">{item.icon}</span>
                    {item.name}
                  </Link>
                ))}
              </>
            )}
          </nav>
        </aside>

        {/* Main Content */}
        <main id="main-content" className="flex-1 p-8 max-w-7xl" role="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
