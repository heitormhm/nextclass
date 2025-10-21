import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'student' | 'teacher' | 'admin' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole;
  isValidated: boolean | null;
  loading: boolean;
  firstName: string;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [isValidated, setIsValidated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState<string>('');

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Extract first name from user metadata
        const fullName = session?.user?.user_metadata?.full_name || '';
        const extractedFirstName = fullName ? fullName.split(' ')[0] : '';
        setFirstName(extractedFirstName);
        
        // Defer role fetching to avoid blocking auth state updates
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          setRole(null);
          setIsValidated(null);
          setFirstName('');
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Extract first name from user metadata
      const fullName = session?.user?.user_metadata?.full_name || '';
      const extractedFirstName = fullName ? fullName.split(' ')[0] : '';
      setFirstName(extractedFirstName);
      
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      // Fetch role and validation status from user_roles table
      const { data, error } = await supabase
        .from('user_roles')
        .select('role, is_validated')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        setRole(null);
        setIsValidated(null);
      } else if (data?.role) {
        setRole(data.role as UserRole);
        setIsValidated(data.is_validated ?? null);
      } else {
        // User not found in user_roles table, default to student
        setRole('student');
        setIsValidated(true);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      setRole(null);
      setIsValidated(null);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error signing out:', error);
        throw error;
      }
      
      // Clear local state
      setUser(null);
      setSession(null);
      setRole(null);
      setIsValidated(null);
      setFirstName('');
    } catch (error) {
      console.error('Failed to sign out:', error);
      throw error;
    }
  };

  const value = {
    user,
    session,
    role,
    isValidated,
    loading,
    firstName,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
