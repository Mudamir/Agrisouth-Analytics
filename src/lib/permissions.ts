/**
 * Permission Management Utilities
 * 
 * Handles flexible permission system with role-based defaults
 * and user-specific overrides
 */

import { supabase } from './supabase';
import { logger } from './logger';

export interface Permission {
  id: string;
  permission_key: string;
  name: string;
  description: string | null;
  category: string;
  is_active: boolean;
}

export interface UserPermission {
  id: string;
  user_id: string;
  permission_id: string;
  granted: boolean;
  granted_by: string | null;
  granted_at: string;
  notes: string | null;
  permission?: Permission;
}

export interface RolePermission {
  id: string;
  role: 'admin' | 'manager' | 'user' | 'viewer';
  permission_id: string;
  granted: boolean;
  permission?: Permission;
}

/**
 * Check if user has a specific permission
 * Checks user-specific overrides first, then role permissions
 */
export async function userHasPermission(
  userId: string,
  permissionKey: string
): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { data, error } = await supabase.rpc('user_has_permission', {
      p_user_id: userId,
      p_permission_key: permissionKey,
    });

    if (error) {
      logger.safeError('Error checking permission', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

/**
 * Get all permissions for a user (returns permission keys with granted status)
 */
export async function getUserPermissions(userId: string): Promise<{
  permission_key: string;
  granted: boolean;
  source: 'role' | 'user';
}[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase.rpc('get_user_permissions', {
      p_user_id: userId,
    });

    if (error) {
      logger.safeError('Error getting user permissions', error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.safeError('Error getting user permissions', error);
    return [];
  }
}

/**
 * Get granted permission keys for a user (optimized - direct query instead of RPC)
 * This is faster than using the RPC function for simple permission checks
 */
export async function getUserGrantedPermissions(userId: string): Promise<string[]> {
  if (!supabase) return [];

  try {
    // Fast path: Direct query instead of RPC for better performance
    // Get user's role first
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .eq('is_active', true)
      .single();

    if (!userProfile) return [];

    // Get role permissions
    const { data: rolePerms } = await supabase
      .from('role_permissions')
      .select('granted, permissions!inner(permission_key)')
      .eq('role', userProfile.role)
      .eq('granted', true);

    // Get user-specific overrides
    const { data: userPerms } = await supabase
      .from('user_permissions')
      .select('granted, permissions!inner(permission_key)')
      .eq('user_id', userId);

    // Combine: user overrides take precedence
    const permissionMap = new Map<string, boolean>();
    
    // Add role permissions
    rolePerms?.forEach(rp => {
      const key = (rp.permissions as any)?.permission_key;
      if (key) permissionMap.set(key, rp.granted);
    });

    // Override with user-specific permissions
    userPerms?.forEach(up => {
      const key = (up.permissions as any)?.permission_key;
      if (key) permissionMap.set(key, up.granted);
    });

    // Return only granted permissions
    return Array.from(permissionMap.entries())
      .filter(([_, granted]) => granted)
      .map(([key]) => key);
  } catch (error) {
    logger.safeError('Error getting user granted permissions', error);
    // Fallback to RPC if direct query fails
    try {
      const permissions = await getUserPermissions(userId);
      return permissions.filter(p => p.granted).map(p => p.permission_key);
    } catch (rpcError) {
      logger.safeError('RPC fallback also failed', rpcError);
      return [];
    }
  }
}

/**
 * Get all available permissions
 */
export async function getAllPermissions(): Promise<Permission[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      logger.safeError('Error fetching permissions', error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.safeError('Error fetching permissions', error);
    return [];
  }
}

/**
 * Get user-specific permission overrides
 */
export async function getUserPermissionOverrides(
  userId: string
): Promise<UserPermission[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('user_permissions')
      .select(`
        *,
        permission:permissions(*)
      `)
      .eq('user_id', userId)
      .order('granted_at', { ascending: false });

    if (error) {
      logger.safeError('Error fetching user permission overrides', error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.safeError('Error fetching user permission overrides', error);
    return [];
  }
}

/**
 * Grant or revoke a permission for a user
 */
export async function setUserPermission(
  userId: string,
  permissionId: string,
  granted: boolean,
  grantedBy: string,
  notes?: string
): Promise<UserPermission> {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('user_permissions')
    .upsert({
      user_id: userId,
      permission_id: permissionId,
      granted,
      granted_by: grantedBy,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,permission_id',
    })
    .select(`
      *,
      permission:permissions(*)
    `)
    .single();

  if (error) {
    logger.safeError('Error setting user permission', error);
    throw error;
  }

  return data;
}

/**
 * Remove a user permission override (revert to role default)
 */
export async function removeUserPermission(
  userId: string,
  permissionId: string
): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const { error } = await supabase
    .from('user_permissions')
    .delete()
    .eq('user_id', userId)
    .eq('permission_id', permissionId);

  if (error) {
    logger.safeError('Error removing user permission', error);
    throw error;
  }
}

/**
 * Get permissions grouped by category
 */
export async function getPermissionsByCategory(): Promise<
  Record<string, Permission[]>
> {
  const permissions = await getAllPermissions();
  const grouped: Record<string, Permission[]> = {};

  permissions.forEach((permission) => {
    if (!grouped[permission.category]) {
      grouped[permission.category] = [];
    }
    grouped[permission.category].push(permission);
  });

  return grouped;
}

