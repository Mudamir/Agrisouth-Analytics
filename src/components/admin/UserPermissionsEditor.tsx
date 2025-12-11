/**
 * User Permissions Editor Component
 * 
 * Allows admins to override user permissions on a per-user basis
 */

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAllPermissions,
  getUserPermissionOverrides,
  getUserPermissions,
  setUserPermission,
  removeUserPermission,
  getPermissionsByCategory,
  type Permission,
  type UserPermission,
} from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Shield, CheckCircle2, XCircle, LayoutDashboard, BarChart3, Database, DollarSign, Users, Settings, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface UserPermissionsEditorProps {
  userId: string;
  userName: string;
  userRole: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPermissionsUpdated: () => void;
}

export function UserPermissionsEditor({
  userId,
  userName,
  userRole,
  open,
  onOpenChange,
  onPermissionsUpdated,
}: UserPermissionsEditorProps) {
  const { user: currentUser, refreshPermissions } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userOverrides, setUserOverrides] = useState<Map<string, boolean>>(new Map());
  const [userActualPermissions, setUserActualPermissions] = useState<Map<string, boolean>>(new Map());
  const [permissionsByCategory, setPermissionsByCategory] = useState<Record<string, Permission[]>>({});

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, userId]);

  async function loadData() {
    try {
      setLoading(true);
      
      // Load all available permissions
      const allPermissions = await getAllPermissions();
      setPermissions(allPermissions);
      
      // Group by category
      const grouped = await getPermissionsByCategory();
      setPermissionsByCategory(grouped);
      
      // Load user's permission overrides
      const overrides = await getUserPermissionOverrides(userId);
      const overrideMap = new Map<string, boolean>();
      overrides.forEach(override => {
        if (override.permission) {
          overrideMap.set(override.permission.permission_key, override.granted);
        }
      });
      setUserOverrides(overrideMap);

      // Load user's actual permissions (role + overrides combined)
      const actualPerms = await getUserPermissions(userId);
      const actualPermsMap = new Map<string, boolean>();
      actualPerms.forEach(perm => {
        actualPermsMap.set(perm.permission_key, perm.granted);
      });
      setUserActualPermissions(actualPermsMap);
    } catch (error) {
      console.error('Error loading permissions:', error);
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  }

  async function handlePermissionToggle(permissionId: string, permissionKey: string, granted: boolean) {
    if (!currentUser?.id) return;

    try {
      setSaving(true);
      
      if (granted) {
        // Grant permission
        await setUserPermission(userId, permissionId, true, currentUser.id);
        setUserOverrides(prev => new Map(prev).set(permissionKey, true));
        toast.success('Permission granted');
      } else {
        // Check if there's an override - if so, remove it to revert to role default
        // If no override exists, explicitly deny it
        if (userOverrides.has(permissionKey)) {
          // Remove override to revert to role default
          await removeUserPermission(userId, permissionId);
          setUserOverrides(prev => {
            const newMap = new Map(prev);
            newMap.delete(permissionKey);
            return newMap;
          });
          toast.success('Permission override removed (reverted to role default)');
        } else {
          // Explicitly deny
          await setUserPermission(userId, permissionId, false, currentUser.id);
          setUserOverrides(prev => new Map(prev).set(permissionKey, false));
          toast.success('Permission denied');
        }
      }
      
      // Reload actual permissions to reflect changes
      const actualPerms = await getUserPermissions(userId);
      const actualPermsMap = new Map<string, boolean>();
      actualPerms.forEach(perm => {
        actualPermsMap.set(perm.permission_key, perm.granted);
      });
      setUserActualPermissions(actualPermsMap);
      
      // Refresh permissions for the current user if they're editing their own permissions
      if (userId === currentUser.id) {
        await refreshPermissions();
      }
      
      // Notify parent to refresh
      onPermissionsUpdated();
    } catch (error) {
      console.error('Error updating permission:', error);
      toast.error('Failed to update permission');
    } finally {
      setSaving(false);
    }
  }

  function getPermissionStatus(permissionKey: string): 'granted' | 'denied' | 'default' {
    if (userOverrides.has(permissionKey)) {
      return userOverrides.get(permissionKey) ? 'granted' : 'denied';
    }
    return 'default';
  }

  // Get page access summary
  const pageAccessSummary = useMemo(() => {
    const pageIcons: Record<string, any> = {
      'page.dashboard': LayoutDashboard,
      'page.analysis': BarChart3,
      'page.data': Database,
      'page.pnl': DollarSign,
      'page.users': Users,
      'page.configuration': Settings,
      'page.data_logs': FileText,
    };

    const pageNames: Record<string, string> = {
      'page.dashboard': 'Dashboard',
      'page.analysis': 'Analysis',
      'page.data': 'Data',
      'page.pnl': 'PNL',
      'page.users': 'User Management',
      'page.configuration': 'Configuration',
      'page.data_logs': 'Data Logs',
    };

    const pagePermissions = permissions.filter(p => p.permission_key.startsWith('page.'));
    return pagePermissions.map(perm => {
      const isOverridden = userOverrides.has(perm.permission_key);
      const isGranted = userActualPermissions.get(perm.permission_key) === true;
      const Icon = pageIcons[perm.permission_key] || LayoutDashboard;
      
      return {
        key: perm.permission_key,
        name: pageNames[perm.permission_key] || perm.name,
        icon: Icon,
        granted: isGranted,
        overridden: isOverridden,
        permission: perm,
      };
    });
  }, [permissions, userOverrides, userActualPermissions]);

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Manage Permissions: {userName}
          </DialogTitle>
          <DialogDescription>
            Override permissions for this user. Changes take precedence over role-based permissions.
            <br />
            <span className="text-xs text-muted-foreground mt-1 block">
              Default role: <Badge variant="outline">{userRole}</Badge>
            </span>
            <span className="text-xs text-green-600 dark:text-green-400 mt-1 block font-medium">
              ✓ Changes are applied immediately - the user will see updated access without refreshing
            </span>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Page Access Summary - Prominent Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-base mb-1 text-foreground">
                  📄 Page Access
                </h3>
                <Badge variant="outline" className="text-xs">
                  {pageAccessSummary.filter(p => p.granted).length} of {pageAccessSummary.length} pages
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                {pageAccessSummary.map((page) => {
                  const Icon = page.icon;
                  return (
                    <div
                      key={page.key}
                      className={cn(
                        'flex items-center justify-between p-4 rounded-lg border transition-all',
                        page.granted
                          ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                          : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'p-2 rounded-lg',
                          page.granted
                            ? 'bg-green-100 dark:bg-green-900/30'
                            : 'bg-red-100 dark:bg-red-900/30'
                        )}>
                          <Icon className={cn(
                            'w-5 h-5',
                            page.granted ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                          )} />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{page.name}</div>
                          {page.overridden && (
                            <Badge variant="outline" className="text-xs mt-1">
                              Custom
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Switch
                        checked={page.granted}
                        onCheckedChange={(checked) =>
                          handlePermissionToggle(page.permission.id, page.key, checked)
                        }
                        disabled={saving}
                      />
                    </div>
                  );
                })}
              </div>
              <Separator className="my-4" />
            </div>

            {/* Other Permissions by Category */}
            {Object.entries(permissionsByCategory)
              .filter(([category]) => category !== 'Page Access')
              .map(([category, categoryPermissions]) => (
                <div key={category}>
                  <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {categoryPermissions.map((permission) => {
                      const status = getPermissionStatus(permission.permission_key);
                      const isOverridden = userOverrides.has(permission.permission_key);
                      const isGranted = status === 'granted';

                      return (
                        <div
                          key={permission.id}
                          className={cn(
                            'flex items-center justify-between p-3 rounded-lg border transition-colors',
                            isOverridden
                              ? 'bg-accent/50 border-accent'
                              : 'bg-card border-border'
                          )}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Label
                                htmlFor={`perm-${permission.id}`}
                                className="font-medium cursor-pointer"
                              >
                                {permission.name}
                              </Label>
                              {isOverridden && (
                                <Badge variant="outline" className="text-xs">
                                  Override
                                </Badge>
                              )}
                              {status === 'granted' && (
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              )}
                              {status === 'denied' && (
                                <XCircle className="w-4 h-4 text-red-600" />
                              )}
                            </div>
                            {permission.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {permission.description}
                              </p>
                            )}
                          </div>
                          <Switch
                            id={`perm-${permission.id}`}
                            checked={isGranted}
                            onCheckedChange={(checked) =>
                              handlePermissionToggle(permission.id, permission.permission_key, checked)
                            }
                            disabled={saving}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <Separator className="mt-4" />
                </div>
              ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <p className="text-xs text-muted-foreground">
              {userOverrides.size > 0 && (
                <span>
                  {userOverrides.size} permission override{userOverrides.size !== 1 ? 's' : ''} active
                </span>
              )}
            </p>
            <Button onClick={() => onOpenChange(false)} disabled={saving}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

