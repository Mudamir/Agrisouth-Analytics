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
  LayoutDashboard,
  BarChart3,
  Database,
  DollarSign,
  Users,
  Settings,
  FileText,
  Loader2,
  FileCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Page definitions with icons
const PAGES = [
  { key: 'page.dashboard', name: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-600' },
  { key: 'page.analysis', name: 'Analysis', icon: BarChart3, color: 'text-purple-600' },
  { key: 'page.data', name: 'Data', icon: Database, color: 'text-green-600' },
  { key: 'page.pnl', name: 'PNL', icon: DollarSign, color: 'text-yellow-600' },
  { key: 'page.generate', name: 'Generate', icon: FileCheck, color: 'text-teal-600' },
  { key: 'page.users', name: 'User Management', icon: Users, color: 'text-red-600' },
  { key: 'page.configuration', name: 'Configuration', icon: Settings, color: 'text-gray-600' },
  { key: 'page.data_logs', name: 'Data Logs', icon: FileText, color: 'text-orange-600' },
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
      {/* Elegant Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          <div>
            <h2 className="text-2xl font-bold font-heading text-foreground tracking-tight mb-2">Page Access</h2>
            <div className="w-12 h-1 bg-gradient-to-r from-primary to-secondary rounded-full" />
          </div>
          <p className="text-sm text-muted-foreground">
            Toggle page access for users
          </p>
        </div>
        <Button 
          onClick={loadData} 
          variant="outline" 
          size="sm" 
          className="gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <Loader2 className={cn("w-4 h-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Modern Elegant Table */}
      <div className="bg-gradient-to-br from-card to-card/50 rounded-xl border border-border/60 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-muted/50 via-muted/40 to-muted/50 border-b-2 border-border/60">
                <TableHead className="sticky left-0 bg-gradient-to-r from-muted/60 to-muted/50 z-20 min-w-[220px] border-r border-border/60 shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                  <span className="text-sm font-bold text-foreground">User</span>
                </TableHead>
                {PAGES.map((page) => {
                  const Icon = page.icon;
                  return (
                    <TableHead key={page.key} className="text-center min-w-[110px] py-4">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted/40 border border-border/50 group-hover:bg-muted/60 transition-colors">
                          <Icon className={cn('w-4 h-4', page.color)} />
                        </div>
                        <span className="text-xs font-semibold text-foreground">{page.name}</span>
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user, index) => {
                const access = userAccess.get(user.id);

                return (
                  <TableRow 
                    key={user.id}
                    className={cn(
                      "hover:bg-muted/30 transition-all duration-200 border-b border-border/40 group",
                      index % 2 === 0 && "bg-card/50"
                    )}
                  >
                    <TableCell className="sticky left-0 bg-card z-10 border-r border-border/60 shadow-[2px_0_4px_rgba(0,0,0,0.05)] py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-secondary/15 flex items-center justify-center flex-shrink-0 border border-primary/20 shadow-sm">
                          <span className="text-sm font-bold text-primary">
                            {(user.full_name || user.email).charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-foreground truncate">
                            {user.full_name || user.email}
                          </div>
                          <Badge variant="outline" className="text-xs mt-1.5 border-border/60">
                            {user.role.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    {PAGES.map((page) => {
                      const hasAccess = access?.pageAccess.get(page.key) === true;
                      const isSaving = saving.has(`${user.id}-${page.key}`);
                      const Icon = page.icon;

                      // Debug for data logs
                      if (page.key === 'page.data_logs') {
                        console.log(`User ${user.email} - Data Logs checkbox state:`, {
                          hasAccess,
                          pageAccessValue: access?.pageAccess.get(page.key),
                          pageAccessMap: access?.pageAccess,
                          allKeys: Array.from(access?.pageAccess.keys() || []),
                        });
                      }

                      return (
                        <TableCell key={page.key} className="text-center py-5">
                          {isSaving ? (
                            <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
                          ) : (
                            <div className="flex items-center justify-center">
                              <Checkbox
                                checked={hasAccess || false}
                                onCheckedChange={(checked) => {
                                  console.log(`Toggling ${page.key} for ${user.email}:`, checked);
                                  togglePageAccess(user.id, page.key, checked === true);
                                }}
                                className={cn(
                                  "w-5 h-5 transition-all duration-200",
                                  hasAccess && "ring-2 ring-primary/30"
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

    </div>
  );
}


