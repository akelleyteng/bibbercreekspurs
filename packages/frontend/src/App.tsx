import { Routes, Route } from 'react-router-dom';

import MemberLayout from './layouts/MemberLayout';
import PublicLayout from './layouts/PublicLayout';
import AdminPage from './pages/AdminPage';
import BlogDetailPage from './pages/BlogDetailPage';
import BlogPage from './pages/BlogPage';
import CalendarPage from './pages/CalendarPage';
import DashboardPage from './pages/DashboardPage';
import DriveFilesPage from './pages/DriveFilesPage';
import EventDetailPage from './pages/EventDetailPage';
import EventsPage from './pages/EventsPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import MembersPage from './pages/MembersPage';
import OfficersPage from './pages/OfficersPage';
import RegisterPage from './pages/RegisterPage';
import SocialFeedPage from './pages/SocialFeedPage';

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogDetailPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
      </Route>

      {/* Member Routes */}
      <Route element={<MemberLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/feed" element={<SocialFeedPage />} />
        <Route path="/members" element={<MembersPage />} />
        <Route path="/officers" element={<OfficersPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/files" element={<DriveFilesPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Route>
    </Routes>
  );
}

export default App;
