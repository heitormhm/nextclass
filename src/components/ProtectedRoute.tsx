import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
  role?: 'student' | 'teacher' | 'admin';
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
    // Log unauthorized access attempt to console
    console.warn('[SECURITY] Unauthorized access attempt:', {
      attemptedRoute: window.location.pathname,
      attemptedRole: role,
      actualRole: userRole,
      userId: user?.id,
      timestamp: new Date().toISOString()
    });

    // Log to database for audit trail (fire and forget)
    supabase.from('security_logs').insert({
      user_id: user.id,
      attempted_route: window.location.pathname,
      attempted_role: role,
      actual_role: userRole,
      user_agent: navigator.userAgent,
      ip_address: null // IP is not accessible from client-side
    }).then(({ error }) => {
      if (error) {
        console.error('[SECURITY] Failed to log security event:', error);
      }
    });

    // Show user-friendly error toast
    toast.error('Acesso negado', {
      description: `Esta página é exclusiva para ${role === 'teacher' ? 'professores' : role === 'admin' ? 'administradores' : 'alunos'}.`
    });

    // Redirect to appropriate dashboard based on user's actual role
    const redirectPath = userRole === 'admin' 
      ? '/admindashboard' 
      : userRole === 'teacher' 
        ? '/teacherdashboard' 
        : '/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  // User is authenticated and has the correct role (or no role is required)
  return <>{children}</>;
};
