/**
 * React Hook for User Management
 * 
 * For 10-15 users, direct queries are efficient
 * Uses React Query for caching and automatic refetching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAllUsers,
  getActiveUsers,
  getUserById,
  getUserByEmail,
  getCurrentUserProfile,
  updateUserProfile,
  getUsersByRole,
  deactivateUser,
  activateUser,
  type UserProfile,
} from '@/lib/users';

/**
 * Get all users (admin only)
 */
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: getAllUsers,
    staleTime: 5 * 60 * 1000, // 5 minutes - users don't change often
  });
}

/**
 * Get active users only
 */
export function useActiveUsers() {
  return useQuery({
    queryKey: ['users', 'active'],
    queryFn: getActiveUsers,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get users by role
 */
export function useUsersByRole(role: UserProfile['role']) {
  return useQuery({
    queryKey: ['users', 'role', role],
    queryFn: () => getUsersByRole(role),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get current user's profile
 */
export function useCurrentUserProfile() {
  return useQuery({
    queryKey: ['user', 'current'],
    queryFn: getCurrentUserProfile,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get user by ID
 */
export function useUser(userId: string | null) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => userId ? getUserById(userId) : null,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Mutation to update user profile
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: Partial<Pick<UserProfile, 'full_name' | 'role' | 'is_active'>> }) =>
      updateUserProfile(userId, updates),
    onSuccess: () => {
      // Invalidate all user queries to refetch
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
}

/**
 * Mutation to toggle user active status
 */
export function useToggleUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      isActive ? deactivateUser(userId) : activateUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
}

