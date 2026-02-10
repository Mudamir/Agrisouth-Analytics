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
import { getCurrentUserProfile, getUserById, updateLastLogin, clearLastLogin, type UserProfile } from '@/lib/users';
import { getUserGrantedPermissions } from '@/lib/permissions';
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
  canAccessPage: (page: 'dashboard' | 'analysis' | 'data' | 'pnl' | 'generate' | 'users' | 'configuration' | 'data-logs') => boolean;
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
                  // Set login timestamp for 8-hour auto-logout (only on SIGNED_IN, not TOKEN_REFRESHED)
                  if (event === 'SIGNED_IN') {
                    localStorage.setItem('loginTimestamp', Date.now().toString());
                  } else if (event === 'TOKEN_REFRESHED') {
                    // On token refresh, preserve existing timestamp if it exists
                    if (!localStorage.getItem('loginTimestamp')) {
                      localStorage.setItem('loginTimestamp', Date.now().toString());
                    }
                  }
                  // Load user profile
                  loadUserProfile(session.user.id).catch((err) => logger.safeError('Error loading user profile', err));
                  // Update last login (fire and forget)
                  updateLastLogin(session.user.id).catch((err) => logger.safeError('Error updating last login', err));
                }
              } else if (event === 'SIGNED_OUT') {
                // Clear last_login to mark user as inactive
                const currentUserId = user?.id;
                if (currentUserId) {
                  clearLastLogin(currentUserId).catch((err) => 
                    logger.safeError('Error clearing last login on sign out', err)
                  );
                }
                
                setSession(null);
                setUser(null);
                setUserProfile(null);
                setUserPermissions([]);
                // Clear login timestamp on sign out
                localStorage.removeItem('loginTimestamp');
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

  // Heartbeat: Update last_login periodically while user is active (every 2 minutes)
  useEffect(() => {
    if (!user?.id || !session) return;

    // Update immediately on mount
    updateLastLogin(user.id).catch((err) => 
      logger.safeError('Error updating last login heartbeat', err)
    );

    // Update every 2 minutes to keep user marked as active
    const heartbeatInterval = setInterval(() => {
      if (user?.id) {
        updateLastLogin(user.id).catch((err) => 
          logger.safeError('Error updating last login heartbeat', err)
        );
      }
    }, 2 * 60 * 1000); // Every 2 minutes

    return () => clearInterval(heartbeatInterval);
  }, [user?.id, session]);

  // Handle tab visibility: Update last_login when tab becomes visible again
  // When tab is hidden or closed, the heartbeat stops, so last_login will become stale after 5 minutes
  useEffect(() => {
    if (!user?.id || !session) return;

    let hiddenTimeout: NodeJS.Timeout | null = null;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is now hidden - clear any existing timeout
        if (hiddenTimeout) {
          clearTimeout(hiddenTimeout);
          hiddenTimeout = null;
        }
        // Don't clear immediately - user might just be switching tabs
        // The heartbeat stopping will naturally cause status to become inactive after 5 minutes
      } else {
        // Tab is visible again - immediately update last_login to mark as active
        if (user?.id) {
          updateLastLogin(user.id).catch((err) => 
            logger.safeError('Error updating last login on visibility change', err)
          );
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (hiddenTimeout) {
        clearTimeout(hiddenTimeout);
      }
    };
  }, [user?.id, session]);

  // Define handleLogout before it's used in the 8-hour timeout effect
  const handleLogout = useCallback(async () => {
    try {
      // Clear last_login to mark user as inactive
      const currentUserId = user?.id;
      if (currentUserId) {
        clearLastLogin(currentUserId).catch((err) => 
          logger.safeError('Error clearing last login on logout', err)
        );
      }
      
      // Clear state immediately - this ensures user is logged out
      setUser(null);
      setSession(null);
      setUserProfile(null);
      setUserPermissions([]);
      // Clear login timestamp on logout
      localStorage.removeItem('loginTimestamp');
      
      // Navigate to login immediately
      navigate('/login', { replace: true });
      
      // Then perform the actual logout (this is async but navigation already happened)
      await authLogout();
    } catch (error) {
      logger.safeError('Logout error', error);
      // Even if logout fails, ensure we're on login page and state is cleared
      setUser(null);
      setSession(null);
      setUserProfile(null);
      setUserPermissions([]);
      localStorage.removeItem('loginTimestamp');
      navigate('/login', { replace: true });
    }
  }, [navigate, user]);

  // 8-hour auto-logout timer
  useEffect(() => {
    if (!user || !session) {
      // Clear login timestamp if user is not authenticated
      localStorage.removeItem('loginTimestamp');
      return;
    }

    // Get or set login timestamp
    const getLoginTimestamp = (): number => {
      const stored = localStorage.getItem('loginTimestamp');
      if (stored) {
        return parseInt(stored, 10);
      }
      // If no timestamp exists, set it to now (for existing sessions)
      const now = Date.now();
      localStorage.setItem('loginTimestamp', now.toString());
      return now;
    };

    const loginTimestamp = getLoginTimestamp();
    const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

    // Check if 8 hours have passed
    const checkTimeout = () => {
      const now = Date.now();
      const elapsed = now - loginTimestamp;

      if (elapsed >= EIGHT_HOURS_MS) {
        logger.debug('8-hour session timeout reached, logging out user');
        handleLogout().catch((err) => logger.safeError('Error during auto-logout', err));
        localStorage.removeItem('loginTimestamp');
      }
    };

    // Check immediately
    checkTimeout();

    // Check every minute
    const interval = setInterval(checkTimeout, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [user, session, handleLogout]);

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
        
        // Set or restore login timestamp for 8-hour auto-logout
        // Only set if it doesn't exist (to preserve existing session time)
        if (!localStorage.getItem('loginTimestamp')) {
          localStorage.setItem('loginTimestamp', Date.now().toString());
        }
        
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
        // Set login timestamp for 8-hour auto-logout
        localStorage.setItem('loginTimestamp', Date.now().toString());
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
    
    // Check if permission is in the granted permissions list
    return userPermissions.includes(permissionKey);
  }, [userProfile, user, userPermissions]);

  // Access control helpers - now uses permission system
  const canAccessPage = useCallback((page: 'dashboard' | 'analysis' | 'data' | 'pnl' | 'generate' | 'users' | 'configuration' | 'data-logs'): boolean => {
    if (!userProfile || !userProfile.is_active) return false;
    
    // Map page to permission key
    const permissionMap: Record<string, string> = {
      'dashboard': 'page.dashboard',
      'analysis': 'page.analysis',
      'data': 'page.data',
      'pnl': 'page.pnl',
      'generate': 'page.generate',
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
