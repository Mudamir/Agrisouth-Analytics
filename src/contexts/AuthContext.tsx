/**
 * Authentication Context with Security Best Practices
 * 
 * Provides:
 * - Global auth state management
 * - Session persistence
 * - Automatic session refresh
 * - Protected route support
 */

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { login as authLogin, logout as authLogout, getCurrentSession, type LoginCredentials } from '@/lib/auth';
import { getCurrentUserProfile, getUserById, updateLastLogin, type UserProfile } from '@/lib/users';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  userRole: UserProfile['role'] | null;
  canAccessPage: (page: 'dashboard' | 'analysis' | 'data' | 'pnl' | 'users' | 'configuration' | 'data-logs') => boolean;
  canAccessUserManagement: boolean;
  canAccessPNL: boolean;
  canAccessConfiguration: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Load user profile helper
  const loadUserProfile = useCallback(async (userId: string) => {
    try {
      const profile = await getUserById(userId);
      if (profile) {
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    initializeAuth();

    // Listen for auth state changes
    if (supabase) {
      let subscription: { unsubscribe: () => void } | null = null;
      
      try {
        const { data } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            try {
              console.log('Auth state changed:', event);
              
              if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                setSession(session);
                if (session?.user) {
                  setUser(session.user);
                  // Load user profile
                  loadUserProfile(session.user.id).catch(console.error);
                  // Update last login (fire and forget)
                  updateLastLogin(session.user.id).catch(console.error);
                }
              } else if (event === 'SIGNED_OUT') {
                setSession(null);
                setUser(null);
                setUserProfile(null);
                // Only navigate if not already on login page
                if (location.pathname !== '/login') {
                  navigate('/login', { replace: true });
                }
              } else if (event === 'USER_UPDATED') {
                if (session?.user) {
                  setUser(session.user);
                  loadUserProfile(session.user.id).catch(console.error);
                }
              }
            } catch (error) {
              console.error('Error handling auth state change:', error);
            }
          }
        );
        subscription = data.subscription;
      } catch (error) {
        console.error('Error setting up auth listener:', error);
      }

      return () => {
        if (subscription) {
          subscription.unsubscribe();
        }
      };
    }
  }, [navigate, location.pathname]);

  // Auto-refresh session before expiration
  useEffect(() => {
    if (!session) return;

    const refreshInterval = setInterval(async () => {
      const expiresAt = session.expires_at;
      if (expiresAt) {
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = expiresAt - now;
        
        // Refresh if token expires in less than 5 minutes
        if (timeUntilExpiry < 300) {
          await refreshSession();
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(refreshInterval);
  }, [session]);

  async function initializeAuth() {
    try {
      // Only initialize if supabase is available
      if (!supabase) {
        console.warn('Supabase not configured. Auth features disabled.');
        setLoading(false);
        return;
      }

      // Get session (this is the fastest way - uses cached session if available)
      const currentSession = await getCurrentSession();

      if (currentSession && currentSession.user) {
        // Use user from session instead of making another network call
        setSession(currentSession);
        setUser(currentSession.user);
        
        // Load user profile in background (don't block on it)
        // This allows the app to render faster
        loadUserProfile(currentSession.user.id).catch(console.error);
      } else {
        // No session found, set loading to false immediately
        setLoading(false);
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      // Don't block app from loading if auth fails
    } finally {
      // Always set loading to false, even if profile is still loading
      setLoading(false);
    }
  }

  const handleLogin = useCallback(async (credentials: LoginCredentials) => {
    try {
      const response = await authLogin(credentials);
      
      if (response.success && response.user && response.session) {
        setUser(response.user);
        setSession(response.session);
        const from = (location.state as any)?.from?.pathname || '/';
        navigate(from, { replace: true });
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, [navigate, location.state]);

  const handleLogout = useCallback(async () => {
    try {
      await authLogout();
      setUser(null);
      setSession(null);
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }, [navigate]);

  async function refreshSession() {
    try {
      if (!supabase) return;

      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Session refresh error:', error);
        // If refresh fails, logout user
        await handleLogout();
        return;
      }

      if (session) {
        setSession(session);
        if (session.user) {
          setUser(session.user);
        }
      }
    } catch (error) {
      console.error('Unexpected refresh error:', error);
      await handleLogout();
    }
  }

  // Access control helpers
  const canAccessPage = useCallback((page: 'dashboard' | 'analysis' | 'data' | 'pnl' | 'users' | 'configuration' | 'data-logs'): boolean => {
    if (!userProfile || !userProfile.is_active) return false;
    
    const role = userProfile.role;
    
    // ADMIN: Access to everything
    if (role === 'admin') return true;
    
    // MANAGER: Access to everything EXCEPT PNL (managers don't have PNL access by default)
    if (role === 'manager') {
      return page !== 'pnl';
    }
    
    // USER: Access to everything EXCEPT User Management, Data Logs, and PNL
    if (role === 'user') {
      return page !== 'users' && page !== 'data-logs' && page !== 'pnl';
    }
    
    // VIEWER: Access to everything EXCEPT Configuration, User Management, and Data Logs
    if (role === 'viewer') {
      return page !== 'configuration' && page !== 'users' && page !== 'data-logs';
    }
    
    return false;
  }, [userProfile]);

  const canAccessUserManagement = useCallback((): boolean => {
    return canAccessPage('users');
  }, [canAccessPage]);

  const canAccessPNL = useCallback((): boolean => {
    return canAccessPage('pnl');
  }, [canAccessPage]);

  const canAccessConfiguration = useCallback((): boolean => {
    return canAccessPage('configuration');
  }, [canAccessPage]);

  const value: AuthContextType = {
    user,
    userProfile,
    session,
    loading,
    login: handleLogin,
    logout: handleLogout,
    refreshSession,
    isAuthenticated: !!user && !!session,
    isAdmin: userProfile?.role === 'admin' && userProfile?.is_active === true,
    userRole: userProfile?.role || null,
    canAccessPage,
    canAccessUserManagement: canAccessUserManagement(),
    canAccessPNL: canAccessPNL(),
    canAccessConfiguration: canAccessConfiguration(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
