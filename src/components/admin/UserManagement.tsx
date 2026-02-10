/**
 * User Management Component
 * 
 * For managing users in the system (10-15 users max)
 * Admin-only access
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getAllUsers, 
  deactivateUser, 
  activateUser,
  formatLastLoginGMT8,
  type UserProfile 
} from '@/lib/users';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Shield, User, Mail, Calendar, CheckCircle, XCircle, Activity, Grid3x3, Clock, Users2, UserCheck, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SimplePageAccessManager } from './SimplePageAccessManager';

export function UserManagement() {
  const { user: currentUser, isAdmin, userRole } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'access'>('access');

  useEffect(() => {
    // Check if user has permission to view this page
    if (!isAdmin && userRole !== 'manager') {
      setError('Access denied. Only managers and admins can view user management.');
      setLoading(false);
      return;
    }
    loadUsers();

    // Auto-refresh user list every 30 seconds to show real-time status changes
    const refreshInterval = setInterval(() => {
      loadUsers();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(refreshInterval);
  }, [isAdmin, userRole]);

  async function loadUsers() {
    try {
      setLoading(true);
      const allUsers = await getAllUsers();
      setUsers(allUsers);
      setError('');
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }


  async function handleToggleActive(userId: string, isActive: boolean) {
    try {
      if (isActive) {
        await deactivateUser(userId);
      } else {
        await activateUser(userId);
      }
      await loadUsers();
    } catch (err) {
      console.error('Error toggling user status:', err);
      setError('Failed to update user status');
    }
  }


  const getRoleBadgeColor = (role: UserProfile['role']) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800/50';
      case 'manager':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50';
      case 'user':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50';
      case 'viewer':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300 border border-slate-200 dark:border-slate-700/50';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-300 border border-gray-200 dark:border-gray-700/50';
    }
  };

  // Check if user is currently active (within last 5 minutes - has browser open)
  const isCurrentlyActive = (lastLogin: string | null): boolean => {
    if (!lastLogin) return false;
    const lastLoginTime = new Date(lastLogin).getTime();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes
    return (now - lastLoginTime) < fiveMinutes;
  };

  const stats = {
    total: users.length,
    active: users.filter(u => u.is_active).length,
    recentlyActive: users.filter(u => u.is_active && isCurrentlyActive(u.last_login)).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  // Show access denied message if user doesn't have permission
  if (!isAdmin && userRole !== 'manager') {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
          <p className="font-semibold">Access Denied</p>
          <p className="text-sm mt-1">Only managers and admins can view user management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          <div>
            <h1 className="text-3xl font-bold font-heading text-foreground tracking-tight mb-2">User Management</h1>
            <div className="w-16 h-1 bg-gradient-to-r from-primary to-secondary rounded-full" />
          </div>
          <p className="text-sm text-muted-foreground">
            Manage system users and monitor activity
          </p>
        </div>
        <Badge variant="outline" className="text-sm border-border/60">
          <Shield className="w-4 h-4 mr-1" />
          {currentUser?.role === 'admin' ? 'Admin Only' : 'Manager Access'}
        </Badge>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'list' | 'access')} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="access" className="gap-2">
            <Grid3x3 className="w-4 h-4" />
            Page Access
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-2">
            <User className="w-4 h-4" />
            User List
          </TabsTrigger>
        </TabsList>

        <TabsContent value="access" className="mt-6">
          <SimplePageAccessManager />
        </TabsContent>

        <TabsContent value="list" className="mt-6 space-y-6">
          {/* Premium Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="group relative bg-gradient-to-br from-card to-card/80 rounded-2xl border border-border/60 p-6 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Total Users</p>
                  <p className="text-4xl font-bold text-foreground">{stats.total}</p>
                </div>
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 flex items-center justify-center shadow-md">
                  <Users2 className="w-7 h-7 text-primary" />
                </div>
              </div>
            </div>
            
            <div className="group relative bg-gradient-to-br from-emerald-50/50 dark:from-emerald-950/20 to-card rounded-2xl border border-emerald-500/20 p-6 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Active Users</p>
                  <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">{stats.active}</p>
                </div>
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-md">
                  <UserCheck className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </div>
            
            <div className="group relative bg-gradient-to-br from-blue-50/50 dark:from-blue-950/20 to-card rounded-2xl border border-blue-500/20 p-6 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Recently Active</p>
                  <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{stats.recentlyActive}</p>
                  <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
                </div>
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 border border-blue-500/30 flex items-center justify-center shadow-md">
                  <Activity className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Premium User Table */}
          <div className="bg-card rounded-2xl border border-border/50 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-muted/80 via-muted/60 to-muted/80 border-b-2 border-border/60 hover:bg-muted/80">
                    <TableHead className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-bold text-foreground tracking-wide">User</span>
                      </div>
                    </TableHead>
                    <TableHead className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-bold text-foreground tracking-wide">Email</span>
                      </div>
                    </TableHead>
                    <TableHead className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-bold text-foreground tracking-wide">Role</span>
                      </div>
                    </TableHead>
                    <TableHead className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-bold text-foreground tracking-wide">Status</span>
                      </div>
                    </TableHead>
                    <TableHead className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-bold text-foreground tracking-wide">Last Login</span>
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user, index) => {
                    const isActive = user.is_active && isCurrentlyActive(user.last_login);
                    const isCurrentUser = user.id === currentUser?.id;
                    
                    return (
                      <TableRow 
                        key={user.id}
                        className={cn(
                          "hover:bg-muted/40 transition-all duration-200 border-b border-border/30 group",
                          index % 2 === 0 ? "bg-card" : "bg-muted/20",
                          isCurrentUser && "bg-primary/5 border-l-4 border-l-primary"
                        )}
                      >
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border-2 shadow-md group-hover:shadow-lg transition-shadow",
                              isCurrentUser 
                                ? "bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10 border-primary/40"
                                : "bg-gradient-to-br from-primary/20 via-primary/15 to-secondary/15 border-primary/30"
                            )}>
                              <span className={cn(
                                "text-base font-bold",
                                isCurrentUser ? "text-primary" : "text-primary"
                              )}>
                                {(user.full_name || user.email).charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-foreground truncate">
                                  {user.full_name || 'No name'}
                                </span>
                                {isCurrentUser && (
                                  <Badge variant="outline" className="text-xs font-semibold border-primary/30 text-primary px-2 py-0.5">
                                    You
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground/60" />
                            <span className="text-sm text-foreground truncate max-w-[250px]" title={user.email}>
                              {user.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge 
                            className={cn(
                              "font-semibold px-3 py-1 text-xs",
                              getRoleBadgeColor(user.role)
                            )}
                          >
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {isActive ? (
                              <>
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Active</span>
                              </>
                            ) : (
                              <>
                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                <span className="text-sm font-medium text-red-600 dark:text-red-400">Inactive</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          {user.last_login ? (
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="w-4 h-4 text-muted-foreground/60" />
                              <span 
                                className="text-foreground/80 font-medium"
                                title={formatLastLoginGMT8(user.last_login)}
                              >
                                {formatLastLoginGMT8(user.last_login)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">Never logged in</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p className="font-semibold mb-2">Role Permissions:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li><strong>Admin:</strong> Full access, can manage users and all data</li>
              <li><strong>Manager:</strong> Can view and edit data, cannot manage users</li>
              <li><strong>User:</strong> Can view and add data, limited editing</li>
              <li><strong>Viewer:</strong> Read-only access</li>
            </ul>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

