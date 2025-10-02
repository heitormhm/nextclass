import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  role?: 'student' | 'teacher';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, role }) => {
  const { user, role: userRole, loading } = useAuth();

  // Show loading spinner while auth state is being determined
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen animate-fade-in">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to auth page if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If a specific role is required, check if user has the correct role
  if (role && userRole !== role) {
    // Redirect to appropriate dashboard based on user's actual role
    const redirectPath = userRole === 'teacher' ? '/teacherdashboard' : '/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  // User is authenticated and has the correct role (or no role is required)
  return <>{children}</>;
};
