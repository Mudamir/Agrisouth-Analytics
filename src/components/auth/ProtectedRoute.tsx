/**
 * Protected Route Component
 * 
 * Security Features:
 * - Route protection
 * - Automatic redirect to login
 * - Loading state handling
 * - Session validation
 */

import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading, session } = useAuth();
  const location = useLocation();

  // Check if session is still valid
  useEffect(() => {
    if (session) {
      const expiresAt = session.expires_at;
      if (expiresAt) {
        const now = Math.floor(Date.now() / 1000);
        if (expiresAt <= now) {
          // Session expired, will be handled by auth state change listener
          console.warn('Session expired');
        }
      }
    }
  }, [session]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If Supabase is not configured, allow access (for development)
  // In production, you should require authentication
  const supabaseConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseConfigured) {
    console.warn('Supabase not configured. Allowing access without authentication.');
    return <>{children}</>;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Render protected content
  return <>{children}</>;
}

