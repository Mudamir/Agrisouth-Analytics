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
import { getUserGrantedPermissions, userHasPermission } from '@/lib/permissions';
import { logger } from '@/lib/logger';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  userPermissions: string[];
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  userRole: UserProfile['role'] | null;
  canAccessPage: (page: 'dashboard' | 'analysis' | 'data' | 'pnl' | 'users' | 'configuration' | 'data-logs') => boolean;
  hasPermission: (permissionKey: string) => boolean;
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
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  // Load user permissions helper
  const loadUserPermissions = useCallback(async (userId: string) => {
    try {
      const grantedPermissions = await getUserGrantedPermissions(userId);
      setUserPermissions(grantedPermissions);
    } catch (error) {
      logger.safeError('Error loading user permissions', error);
      setUserPermissions([]);
    }
  }, []);

  // Load user profile helper - optimized to load profile and permissions in parallel
  const loadUserProfile = useCallback(async (userId: string) => {
    try {
      // Load profile and permissions in parallel for faster initialization
      const [profile] = await Promise.all([
        getUserById(userId),
        loadUserPermissions(userId), // Load permissions in parallel, don't wait
      ]);
      
      if (profile) {
        setUserProfile(profile);
      }
    } catch (error) {
      logger.safeError('Error loading user profile', error);
    }
  }, [loadUserPermissions]);

  // Refresh permissions (called after permission updates)
  const refreshPermissions = useCallback(async () => {
    if (user?.id) {
      await loadUserPermissions(user.id);
    }
  }, [user, loadUserPermissions]);

  // Initialize auth state
  useEffect(() => {
    initializeAuth();

    // Listen for auth state changes
    if (!supabase) return;

    let subscription: { unsubscribe: () => void } | null = null;
    
    try {
      const { data } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          try {
            logger.debug('Auth state changed:', event);
            
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
              setSession(session);
              if (session?.user) {
                setUser(session.user);
                // Load user profile
                loadUserProfile(session.user.id).catch((err) => logger.safeError('Error loading user profile', err));
                // Update last login (fire and forget)
                updateLastLogin(session.user.id).catch((err) => logger.safeError('Error updating last login', err));
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
                loadUserProfile(session.user.id).catch((err) => logger.safeError('Error loading user profile', err));
              }
            }
          } catch (error) {
            logger.safeError('Error handling auth state change', error);
          }
        }
      );
      subscription = data.subscription;
    } catch (error) {
      logger.safeError('Error setting up auth listener', error);
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [navigate, location.pathname, loadUserProfile]);

  // Listen for user profile and permission changes
  useEffect(() => {
    if (!supabase || !user?.id) return;

    const profilesChannel = supabase
      .channel(`user_profiles_changes_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          logger.debug('User profile updated, refreshing');
          loadUserProfile(user.id).catch((err) => logger.safeError('Error loading user profile', err));
        }
      )
      .subscribe();

    const permissionsChannel = supabase
      .channel(`user_permissions_changes_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_permissions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('User permissions updated, refreshing permissions immediately');
          // Immediately refresh permissions when they change
          loadUserPermissions(user.id).catch((err) => logger.safeError('Error loading user permissions', err));
        }
      )
      .subscribe();

    // Also listen for INSERT and DELETE events on permissions
    const permissionsInsertChannel = supabase
      .channel(`user_permissions_insert_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_permissions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          logger.debug('New permission granted, refreshing');
          loadUserPermissions(user.id).catch((err) => logger.safeError('Error loading user permissions', err));
        }
      )
      .subscribe();

    const permissionsDeleteChannel = supabase
      .channel(`user_permissions_delete_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'user_permissions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          logger.debug('Permission removed, refreshing');
          loadUserPermissions(user.id).catch((err) => logger.safeError('Error loading user permissions', err));
        }
      )
      .subscribe();

    return () => {
      if (profilesChannel && supabase) {
        supabase.removeChannel(profilesChannel);
      }
      if (permissionsChannel && supabase) {
        supabase.removeChannel(permissionsChannel);
      }
      if (permissionsInsertChannel && supabase) {
        supabase.removeChannel(permissionsInsertChannel);
      }
      if (permissionsDeleteChannel && supabase) {
        supabase.removeChannel(permissionsDeleteChannel);
      }
    };
  }, [user?.id, loadUserProfile, loadUserPermissions]);

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

  // Refresh permissions when window regains focus (as a fallback)
  useEffect(() => {
    if (!user?.id) return;

    const handleFocus = () => {
      // Refresh permissions when user returns to the tab
      // This ensures permissions are up-to-date even if real-time updates were missed
      loadUserPermissions(user.id).catch((err) => logger.safeError('Error loading user permissions', err));
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user?.id, loadUserPermissions]);

  async function initializeAuth() {
    try {
      // Only initialize if supabase is available
      if (!supabase) {
        logger.warn('Supabase not configured. Auth features disabled.');
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
      logger.safeError('Auth initialization error', error);
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
      logger.safeError('Login error', error);
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
      logger.safeError('Logout error', error);
      throw error;
    }
  }, [navigate]);

  async function refreshSession() {
    try {
      if (!supabase) return;

      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        logger.safeError('Session refresh error', error);
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
      logger.safeError('Unexpected refresh error', error);
      await handleLogout();
    }
  }

  // Check if user has a specific permission (memoized for performance)
  const hasPermission = useCallback((permissionKey: string): boolean => {
    if (!userProfile || !userProfile.is_active || !user?.id) return false;
    
    // Admin always has all permissions (fast path)
    if (userProfile.role === 'admin') return true;
    
    // Check if permission is in the granted permissions list (O(1) lookup with Set would be faster, but array is fine for small sets)
    return userPermissions.includes(permissionKey);
  }, [userProfile, user, userPermissions]);

  // Access control helpers - now uses permission system
  const canAccessPage = useCallback((page: 'dashboard' | 'analysis' | 'data' | 'pnl' | 'users' | 'configuration' | 'data-logs'): boolean => {
    if (!userProfile || !userProfile.is_active) return false;
    
    // Map page to permission key
    const permissionMap: Record<string, string> = {
      'dashboard': 'page.dashboard',
      'analysis': 'page.analysis',
      'data': 'page.data',
      'pnl': 'page.pnl',
      'users': 'page.users',
      'configuration': 'page.configuration',
      'data-logs': 'page.data_logs',
    };
    
    const permissionKey = permissionMap[page];
    if (!permissionKey) return false;
    
    return hasPermission(permissionKey);
  }, [userProfile, hasPermission]);

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
    userPermissions,
    login: handleLogin,
    logout: handleLogout,
    refreshSession,
    refreshPermissions,
    isAuthenticated: !!user && !!session,
    isAdmin: userProfile?.role === 'admin' && userProfile?.is_active === true,
    userRole: userProfile?.role || null,
    canAccessPage,
    hasPermission,
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

