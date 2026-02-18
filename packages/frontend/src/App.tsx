import { Routes, Route } from 'react-router-dom';

import AdaptiveLayout from './layouts/AdaptiveLayout';
import PublicLayout from './layouts/PublicLayout';
import RequireAuth from './layouts/RequireAuth';
import AdminPage from './pages/AdminPage';
import BlogDetailPage from './pages/BlogDetailPage';
import BlogPage from './pages/BlogPage';
import CalendarPage from './pages/CalendarPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import DashboardPage from './pages/DashboardPage';
import DriveFilesPage from './pages/DriveFilesPage';
import EventDetailPage from './pages/EventDetailPage';
import EventsPage from './pages/EventsPage';
import HelpPage from './pages/HelpPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import MembersPage from './pages/MembersPage';
import OfficersPage from './pages/OfficersPage';
import ProfilePage from './pages/ProfilePage';
import RegisterPage from './pages/RegisterPage';
import SocialFeedPage from './pages/SocialFeedPage';

function App() {
  return (
    <Routes>
      {/* Auth pages: always use public layout */}
      <Route element={<PublicLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
      </Route>

      {/* Adaptive routes: sidebar when logged in, public chrome when not */}
      <Route element={<AdaptiveLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogDetailPage />} />

        {/* Member-only routes (require authentication) */}
        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/feed" element={<SocialFeedPage />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/officers" element={<OfficersPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/files" element={<DriveFilesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
