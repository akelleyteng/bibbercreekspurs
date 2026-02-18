import { useAuth } from '../context/AuthContext';
import MemberLayout from './MemberLayout';
import PublicLayout from './PublicLayout';

export default function AdaptiveLayout() {
  const { isAuthenticated, user, isLoading } = useAuth();

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

  if (isAuthenticated && user) {
    return <MemberLayout />;
  }

  return <PublicLayout />;
}
