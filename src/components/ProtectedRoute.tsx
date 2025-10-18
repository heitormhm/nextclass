import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
    // Log unauthorized access attempt
    console.warn('[SECURITY] Unauthorized access attempt:', {
      attemptedRoute: window.location.pathname,
      attemptedRole: role,
      actualRole: userRole,
      userId: user?.id,
      timestamp: new Date().toISOString()
    });

    // Show user-friendly error toast
    toast.error('Acesso negado', {
      description: `Esta página é exclusiva para ${role === 'teacher' ? 'professores' : 'alunos'}.`
    });

    // Redirect to appropriate dashboard based on user's actual role
    const redirectPath = userRole === 'teacher' ? '/teacherdashboard' : '/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  // User is authenticated and has the correct role (or no role is required)
  return <>{children}</>;
};
