import { Routes, Route, Navigate } from 'react-router-dom';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';

import AdaptiveLayout from './layouts/AdaptiveLayout';
import PublicLayout from './layouts/PublicLayout';
import RequireAuth from './layouts/RequireAuth';
import { CartProvider } from './context/CartContext';
import CartDrawer from './components/CartDrawer';
import AdminPage from './pages/AdminPage';
import BlogDetailPage from './pages/BlogDetailPage';
import BlogPage from './pages/BlogPage';
import CalendarPage from './pages/CalendarPage';
import CartPage from './pages/CartPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import CheckoutPage from './pages/CheckoutPage';
import DashboardPage from './pages/DashboardPage';
import DriveFilesPage from './pages/DriveFilesPage';
import EventDetailPage from './pages/EventDetailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import EventsPage from './pages/EventsPage';
import HelpPage from './pages/HelpPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import MembersPage from './pages/MembersPage';
import OfficersPage from './pages/OfficersPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import OrderStatusPage from './pages/OrderStatusPage';
import PresentationsPage from './pages/PresentationsPage';
import ProfilePage from './pages/ProfilePage';
import ProductDetailPage from './pages/ProductDetailPage';
import RegisterPage from './pages/RegisterPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import NotificationsPage from './pages/NotificationsPage';
import ShopPage from './pages/ShopPage';
import SocialFeedPage from './pages/SocialFeedPage';

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || 'test';

function App() {
  return (
    <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: 'USD' }}>
    <CartProvider>
    <CartDrawer />
    <Routes>
      {/* Auth pages: always use public layout */}
      <Route element={<PublicLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* Adaptive routes: sidebar when logged in, public chrome when not */}
      <Route element={<AdaptiveLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogDetailPage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/shop/cart" element={<CartPage />} />
        <Route path="/shop/checkout" element={<CheckoutPage />} />
        <Route path="/shop/order-confirmation" element={<OrderConfirmationPage />} />
        <Route path="/shop/order-status" element={<OrderStatusPage />} />
        <Route path="/shop/:productId" element={<ProductDetailPage />} />

        {/* Member-only routes (require authentication) */}
        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/feed" element={<SocialFeedPage />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/officers" element={<OfficersPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/files" element={<DriveFilesPage />} />
          <Route path="/presentations" element={<PresentationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Route>
      {/* Redirect old Wix URLs that still rank on Google */}
      <Route path="/contact8" element={<Navigate to="/register" replace />} />
    </Routes>
    </CartProvider>
    </PayPalScriptProvider>
  );
}

export default App;
