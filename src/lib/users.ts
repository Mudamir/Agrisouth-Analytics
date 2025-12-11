/**
 * User Management Utilities
 * 
 * For small user base (10-15 users), direct queries are efficient
 * No need for complex caching or pagination
 */

import { supabase } from './supabase';
import { logger } from './logger';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'manager' | 'user' | 'viewer';
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateUserProfile {
  email: string;
  full_name?: string;
  role?: 'admin' | 'manager' | 'user' | 'viewer';
}

/**
 * Get all users (admin only)
 * For 10-15 users, this is efficient without pagination
 */
export async function getAllUsers(): Promise<UserProfile[]> {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    logger.safeError('Error fetching users', error);
    throw error;
  }

  return data || [];
}

/**
 * Get active users only
 */
export async function getActiveUsers(): Promise<UserProfile[]> {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('is_active', true)
    .order('full_name', { ascending: true });

  if (error) {
    logger.safeError('Error fetching active users', error);
    throw error;
  }

  return data || [];
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<UserProfile | null> {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    logger.safeError('Error fetching user', error);
    throw error;
  }

  return data;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<UserProfile | null> {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    logger.safeError('Error fetching user by email', error);
    throw error;
  }

  return data;
}

/**
 * Get current user's profile
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  if (!supabase) {
    return null;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    return await getUserById(user.id);
  } catch (error) {
    logger.safeError('Error getting current user profile', error);
    return null;
  }
}

/**
 * Update user profile (admin only, or own profile with restrictions)
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'full_name' | 'role' | 'is_active'>>
): Promise<UserProfile> {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    logger.safeError('Error updating user profile', error);
    throw error;
  }

  return data;
}

/**
 * Update last login timestamp
 * Stores in UTC (best practice), but can be converted to GMT+8 for display
 */
export async function updateLastLogin(userId: string): Promise<void> {
  if (!supabase) return;

  try {
    // Store in UTC (PostgreSQL timestamptz handles timezone conversion)
    // The database will store it in UTC, but you can convert to GMT+8 when displaying
    await supabase
      .from('user_profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userId);
  } catch (error) {
    logger.safeError('Error updating last login', error);
    // Don't throw - this is not critical
  }
}

/**
 * Convert UTC timestamp to GMT+8 for display
 */
export function convertToGMT8(utcTimestamp: string | null): string | null {
  if (!utcTimestamp) return null;
  
  const date = new Date(utcTimestamp);
  // GMT+8 is UTC+8
  const gmt8Date = new Date(date.getTime() + (8 * 60 * 60 * 1000));
  
  return gmt8Date.toISOString();
}

/**
 * Format timestamp for display in Philippine Time (PHT)
 */
export function formatLastLoginGMT8(utcTimestamp: string | null): string {
  if (!utcTimestamp) return 'Never';
  
  const date = new Date(utcTimestamp);
  
  // Format: "Dec 8, 2025 8:03 PM PHT" (Philippine Time)
  return date.toLocaleString('en-US', {
    timeZone: 'Asia/Manila', // Philippines timezone
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }) + ' PHT';
}

/**
 * Check if user has role
 */
export async function userHasRole(
  userId: string,
  role: UserProfile['role']
): Promise<boolean> {
  const user = await getUserById(userId);
  return user?.role === role && user?.is_active === true;
}

/**
 * Check if user is admin
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  return userHasRole(userId, 'admin');
}

/**
 * Get users by role
 */
export async function getUsersByRole(
  role: UserProfile['role']
): Promise<UserProfile[]> {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('role', role)
    .eq('is_active', true)
    .order('full_name', { ascending: true });

  if (error) {
    logger.safeError('Error fetching users by role', error);
    throw error;
  }

  return data || [];
}

/**
 * Deactivate user (soft delete)
 */
export async function deactivateUser(userId: string): Promise<void> {
  await updateUserProfile(userId, { is_active: false });
}

/**
 * Activate user
 */
export async function activateUser(userId: string): Promise<void> {
  await updateUserProfile(userId, { is_active: true });
}

