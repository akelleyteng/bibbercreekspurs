import { Outlet, Link, useLocation } from 'react-router-dom';
import { mockCurrentUser } from '../data/mockData';

export default function MemberLayout() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { name: 'Social Feed', href: '/feed', icon: '💬' },
    { name: 'Events', href: '/events', icon: '📅' },
    { name: 'Calendar', href: '/calendar', icon: '🗓️' },
    { name: 'Blog', href: '/blog', icon: '📝' },
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
                {mockCurrentUser.firstName} {mockCurrentUser.lastName}
              </span>
              <div
                className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-600 text-white font-bold"
                aria-label={`${mockCurrentUser.firstName} ${mockCurrentUser.lastName} avatar`}
                role="img"
              >
                {mockCurrentUser.firstName[0]}
                {mockCurrentUser.lastName[0]}
              </div>
              <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900" aria-label="Logout">
                Logout
              </Link>
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
            {mockCurrentUser.role === 'ADMIN' && (
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
