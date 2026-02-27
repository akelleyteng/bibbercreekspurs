import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';

import { useAuth } from '../context/AuthContext';
import MemberAvatar, { seedAvatarCache } from '../components/MemberAvatar';

// Member layout with user menu dropdown (Profile/Help/Logout)
// Rendered by AdaptiveLayout when user is authenticated — no auth check here.
export default function MemberLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Type-narrowing guard (never executes — AdaptiveLayout guarantees user is set)
  if (!user) return null;

  // Seed avatar cache so MemberAvatar renders instantly for the current user
  seedAvatarCache([{ id: user.id, profilePhotoUrl: user.profilePhotoUrl, horsePhotoUrl: user.horsePhotoUrl, avatarChoice: user.avatarChoice }]);

  const isActive = (path: string) => {
    // Exact match
    if (location.pathname === path) return true;
    // Also check if we're on a detail page (e.g., /events/123 matches /events)
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

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { name: 'Social Feed', href: '/feed', icon: '💬' },
    { name: 'Events', href: '/events', icon: '📅' },
    { name: 'Calendar', href: '/calendar', icon: '🗓️' },
    { name: 'Blog', href: '/blog', icon: '📝' },
    { name: 'Members', href: '/members', icon: '👥' },
    { name: 'Officers', href: '/officers', icon: '⭐' },
    { name: 'Club Meetings', href: '/presentations', icon: '🎤' },
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
              <Link to="/" className="text-lg sm:text-xl font-bold text-primary-600" aria-label="Bibber Creek Spurs 4-H Home">
                <span aria-hidden="true">🍀</span>
                <span className="hidden sm:inline"> Bibber Creek Spurs 4-H</span>
                <span className="sm:hidden"> BCS 4-H</span>
              </Link>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span className="hidden sm:inline text-sm text-gray-700" aria-label="Current user">
                {user.firstName} {user.lastName}
              </span>

              {/* User Menu Dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => {
                    setIsUserMenuOpen(!isUserMenuOpen);
                  }}
                  className="flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-full"
                  aria-label="User menu"
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                >
                  <MemberAvatar userId={user.id} firstName={user.firstName} lastName={user.lastName} size="md" />
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
        {/* Sidebar — icons only on mobile, full width on sm+ */}
        <aside className="w-14 sm:w-64 bg-white shadow-sm min-h-[calc(100vh-4rem)] flex-shrink-0" role="navigation" aria-label="Sidebar navigation">
          <nav className="px-1.5 sm:px-4 py-4 sm:py-6 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center justify-center sm:justify-start px-2 sm:px-4 py-2.5 sm:py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive(item.href)
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                aria-current={isActive(item.href) ? 'page' : undefined}
                title={item.name}
              >
                <span className="sm:mr-3 text-lg" aria-hidden="true">{item.icon}</span>
                <span className="hidden sm:inline">{item.name}</span>
              </Link>
            ))}

            {/* Admin Section */}
            {user.role === 'ADMIN' && (
              <>
                <div className="pt-4 sm:pt-6 pb-2" role="separator">
                  <p className="hidden sm:block px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Administration
                  </p>
                  <hr className="sm:hidden border-gray-200 mx-1" />
                </div>
                {adminNavigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center justify-center sm:justify-start px-2 sm:px-4 py-2.5 sm:py-3 text-sm font-medium rounded-lg transition-colors ${
                      isActive(item.href)
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    title={item.name}
                  >
                    <span className="sm:mr-3 text-lg" aria-hidden="true">{item.icon}</span>
                    <span className="hidden sm:inline">{item.name}</span>
                  </Link>
                ))}
              </>
            )}
          </nav>
        </aside>

        {/* Main Content */}
        <main id="main-content" className="flex-1 p-4 sm:p-8 max-w-7xl min-w-0" role="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
