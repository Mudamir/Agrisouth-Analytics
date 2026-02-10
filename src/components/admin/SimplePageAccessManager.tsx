/**
 * Simple Page Access Manager
 * 
 * Best-in-class solution for managing page access for 10-15 users
 * - Visual, intuitive interface
 * - No coding required
 * - Quick presets and templates
 * - Real-time updates
 */

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAllUsers,
  type UserProfile
} from '@/lib/users';
import {
  getUserPermissions,
  setUserPermission,
  removeUserPermission,
  getAllPermissions,
  type Permission,
} from '@/lib/permissions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Home,
  TrendingUp,
  Table2,
  DollarSign,
  UserCog,
  Cog,
  History,
  Loader2,
  FilePlus,
  RefreshCw,
  Shield,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Page definitions with better icons and refined colors
const PAGES = [
  { key: 'page.dashboard', name: 'Dashboard', icon: Home, bgColor: 'bg-blue-500/10', iconColor: 'text-blue-600', borderColor: 'border-blue-500/20' },
  { key: 'page.analysis', name: 'Analysis', icon: TrendingUp, bgColor: 'bg-purple-500/10', iconColor: 'text-purple-600', borderColor: 'border-purple-500/20' },
  { key: 'page.data', name: 'Data', icon: Table2, bgColor: 'bg-emerald-500/10', iconColor: 'text-emerald-600', borderColor: 'border-emerald-500/20' },
  { key: 'page.pnl', name: 'PNL', icon: DollarSign, bgColor: 'bg-amber-500/10', iconColor: 'text-amber-600', borderColor: 'border-amber-500/20' },
  { key: 'page.generate', name: 'Generate', icon: FilePlus, bgColor: 'bg-cyan-500/10', iconColor: 'text-cyan-600', borderColor: 'border-cyan-500/20' },
  { key: 'page.users', name: 'User Management', icon: UserCog, bgColor: 'bg-rose-500/10', iconColor: 'text-rose-600', borderColor: 'border-rose-500/20' },
  { key: 'page.configuration', name: 'Configuration', icon: Cog, bgColor: 'bg-slate-500/10', iconColor: 'text-slate-600', borderColor: 'border-slate-500/20' },
  { key: 'page.data_logs', name: 'Data Logs', icon: History, bgColor: 'bg-orange-500/10', iconColor: 'text-orange-600', borderColor: 'border-orange-500/20' },
] as const;


interface UserPageAccess {
  userId: string;
  userName: string;
  userRole: string;
  pageAccess: Map<string, boolean>;
  permissions: Map<string, Permission>;
}

export function SimplePageAccessManager() {
  const { user: currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userAccess, setUserAccess] = useState<Map<string, UserPageAccess>>(new Map());
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isAdmin) return;
    loadData();
  }, [isAdmin]);

  async function loadData() {
    try {
      setLoading(true);
      
      // Load users and permissions in parallel
      const [allUsers, allPermissions] = await Promise.all([
        getAllUsers(),
        getAllPermissions(),
      ]);

      setUsers(allUsers);
      setPermissions(allPermissions);

      // Create permission map for quick lookup
      const permissionMap = new Map<string, Permission>();
      allPermissions.forEach(p => {
        if (p.permission_key.startsWith('page.')) {
          permissionMap.set(p.permission_key, p);
        }
      });

      // Load access for each user
      const accessMap = new Map<string, UserPageAccess>();
      
      for (const user of allUsers) {
        const userPerms = await getUserPermissions(user.id);
        const pageAccess = new Map<string, boolean>();
        const userPermMap = new Map<string, Permission>();

        // Initialize all page permissions - first set defaults from role, then override with user-specific
        PAGES.forEach(page => {
          const perm = permissionMap.get(page.key);
          if (perm) {
            userPermMap.set(page.key, perm);
            // Default to false, will be overridden by actual permissions
            pageAccess.set(page.key, false);
          } else {
            console.warn(`Permission not found in database: ${page.key}`);
          }
        });

        // Now apply actual permissions (role-based + overrides)
        // User overrides take precedence over role permissions
        const userOverrides = new Map<string, boolean>();
        const rolePermissions = new Map<string, boolean>();
        
        userPerms.forEach(up => {
          if (up.permission_key.startsWith('page.')) {
            const perm = permissionMap.get(up.permission_key);
            if (perm) {
              userPermMap.set(up.permission_key, perm);
            }
            
            // Separate user overrides from role permissions
            if (up.source === 'user') {
              userOverrides.set(up.permission_key, up.granted);
            } else if (up.source === 'role') {
              rolePermissions.set(up.permission_key, up.granted);
            }
          }
        });
        
        // Apply permissions: user overrides first, then role permissions
        PAGES.forEach(page => {
          if (userOverrides.has(page.key)) {
            // User override takes precedence
            pageAccess.set(page.key, userOverrides.get(page.key)!);
          } else if (rolePermissions.has(page.key)) {
            // Use role permission if no override
            pageAccess.set(page.key, rolePermissions.get(page.key)!);
          }
          // Otherwise stays false (default)
        });

        // Debug: Log data logs permission specifically
        const dataLogsPerm = userPerms.find(p => p.permission_key === 'page.data_logs');
        if (dataLogsPerm) {
          console.log(`User ${user.email} - Data Logs permission:`, dataLogsPerm);
        } else {
          console.log(`User ${user.email} - No Data Logs permission found in userPerms`);
        }

        accessMap.set(user.id, {
          userId: user.id,
          userName: user.full_name || user.email,
          userRole: user.role,
          pageAccess,
          permissions: userPermMap,
        });
      }

      setUserAccess(accessMap);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load user access data');
    } finally {
      setLoading(false);
    }
  }

  async function togglePageAccess(userId: string, pageKey: string, granted: boolean) {
    if (!currentUser?.id) return;

    const userAccessData = userAccess.get(userId);
    if (!userAccessData) return;

    // Find permission from all permissions (ensure it exists)
    let permission = userAccessData.permissions.get(pageKey);
    if (!permission) {
      const perm = permissions.find(p => p.permission_key === pageKey);
      if (!perm) {
        console.error(`Permission not found: ${pageKey}`);
        toast.error(`Permission "${pageKey}" not found in database`);
        return;
      }
      permission = perm;
      userAccessData.permissions.set(pageKey, perm);
    }

    setSaving(prev => new Set(prev).add(`${userId}-${pageKey}`));

    try {
      if (granted) {
        // Grant permission (create or update override)
        await setUserPermission(userId, permission.id, true, currentUser.id);
        toast.success(`${PAGES.find(p => p.key === pageKey)?.name || 'Page'} enabled`);
      } else {
        // Explicitly deny permission (set override to false, don't just remove it)
        // This ensures the checkbox can be unchecked even if role has access
        await setUserPermission(userId, permission.id, false, currentUser.id);
        toast.success(`${PAGES.find(p => p.key === pageKey)?.name || 'Page'} disabled`);
      }

      // Reload permissions from database to get accurate state
      const updatedPerms = await getUserPermissions(userId);
      const updatedPageAccess = new Map<string, boolean>();
      
      // Re-initialize all pages
      PAGES.forEach(page => {
        updatedPageAccess.set(page.key, false);
      });
      
      // Apply actual permissions (user overrides take precedence over role)
      updatedPerms.forEach(up => {
        if (up.permission_key.startsWith('page.')) {
          // User overrides (source === 'user') take precedence
          // If there's a user override, use it; otherwise use role permission
          if (up.source === 'user') {
            updatedPageAccess.set(up.permission_key, up.granted);
          } else if (up.source === 'role' && !updatedPageAccess.has(up.permission_key)) {
            // Only set role permission if there's no user override
            updatedPageAccess.set(up.permission_key, up.granted);
          }
        }
      });

      // Update the user access data
      const updatedAccess = userAccess.get(userId);
      if (updatedAccess) {
        updatedAccess.pageAccess = updatedPageAccess;
        setUserAccess(new Map(userAccess));
      }
    } catch (error) {
      console.error('Error updating access:', error);
      toast.error('Failed to update page access');
    } finally {
      setSaving(prev => {
        const newSet = new Set(prev);
        newSet.delete(`${userId}-${pageKey}`);
        return newSet;
      });
    }
  }


  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
          <p className="font-semibold">Access Denied</p>
          <p className="text-sm mt-1">Only admins can manage page access.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Premium Header Design */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 flex items-center justify-center shadow-sm">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-foreground tracking-tight">Page Access Control</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Manage user permissions across all pages
              </p>
            </div>
          </div>
        </div>
        <Button 
          onClick={loadData} 
          variant="outline" 
          size="sm" 
          className="gap-2 hover:bg-primary hover:text-primary-foreground transition-all duration-200 shadow-sm"
          disabled={loading}
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Premium Table Design */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-muted/80 via-muted/60 to-muted/80 border-b border-border/60 hover:bg-muted/80">
                <TableHead className="sticky left-0 bg-gradient-to-r from-muted/90 to-muted/80 z-30 min-w-[240px] border-r-2 border-border/60 shadow-[4px_0_8px_rgba(0,0,0,0.08)] px-6 py-5">
                  <div className="flex items-center gap-2">
                    <UserCog className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-bold text-foreground tracking-wide">User</span>
                  </div>
                </TableHead>
                {PAGES.map((page) => {
                  const Icon = page.icon;
                  return (
                    <TableHead key={page.key} className="text-center min-w-[130px] px-4 py-5">
                      <div className="flex flex-col items-center gap-2.5">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all duration-200",
                          page.bgColor,
                          page.borderColor,
                          "shadow-sm hover:shadow-md hover:scale-105"
                        )}>
                          <Icon className={cn('w-5 h-5', page.iconColor)} />
                        </div>
                        <span className="text-xs font-bold text-foreground tracking-wide leading-tight text-center max-w-[100px]">
                          {page.name}
                        </span>
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user, index) => {
                const access = userAccess.get(user.id);
                const totalAccess = Array.from(access?.pageAccess.values() || []).filter(Boolean).length;

                return (
                  <TableRow 
                    key={user.id}
                    className={cn(
                      "hover:bg-muted/40 transition-all duration-200 border-b border-border/30 group",
                      index % 2 === 0 ? "bg-card" : "bg-muted/20"
                    )}
                  >
                    <TableCell className="sticky left-0 bg-inherit z-20 border-r-2 border-border/60 shadow-[4px_0_8px_rgba(0,0,0,0.08)] px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 via-primary/15 to-secondary/15 flex items-center justify-center flex-shrink-0 border-2 border-primary/30 shadow-md group-hover:shadow-lg transition-shadow">
                          <span className="text-base font-bold text-primary">
                            {(user.full_name || user.email).charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-foreground truncate mb-1">
                            {user.full_name || user.email}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className="text-xs font-semibold border-border/60 px-2 py-0.5"
                            >
                              {user.role.toUpperCase()}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {totalAccess} access
                            </span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    {PAGES.map((page) => {
                      const hasAccess = access?.pageAccess.get(page.key) === true;
                      const isSaving = saving.has(`${user.id}-${page.key}`);
                      const Icon = page.icon;

                      return (
                        <TableCell key={page.key} className="text-center px-4 py-4">
                          {isSaving ? (
                            <div className="flex items-center justify-center">
                              <Loader2 className="w-5 h-5 animate-spin text-primary" />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              <Checkbox
                                checked={hasAccess || false}
                                onCheckedChange={(checked) => {
                                  togglePageAccess(user.id, page.key, checked === true);
                                }}
                                className={cn(
                                  "w-6 h-6 transition-all duration-200 cursor-pointer border-2",
                                  hasAccess 
                                    ? "border-primary bg-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary ring-2 ring-primary/20" 
                                    : "border-border/60 hover:border-primary/50 hover:bg-muted/50"
                                )}
                              />
                            </div>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Summary Footer */}
      <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Access granted</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-muted-foreground" />
            <span>Access denied</span>
          </div>
        </div>
        <div className="text-xs">
          Total users: <span className="font-semibold text-foreground">{users.length}</span>
        </div>
      </div>
    </div>
  );
}


