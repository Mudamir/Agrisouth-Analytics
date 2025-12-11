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
import { Shield, User, Mail, Calendar, CheckCircle, XCircle, Activity, Settings, Grid3x3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPermissionsEditor } from './UserPermissionsEditor';
import { SimplePageAccessManager } from './SimplePageAccessManager';

export function UserManagement() {
  const { user: currentUser, isAdmin, userRole } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [permissionsEditorOpen, setPermissionsEditorOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'access'>('access');

  useEffect(() => {
    // Check if user has permission to view this page
    if (!isAdmin && userRole !== 'manager') {
      setError('Access denied. Only managers and admins can view user management.');
      setLoading(false);
      return;
    }
    loadUsers();
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
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'manager':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'user':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'viewer':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800';
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
        <div>
          <h1 className="text-3xl font-bold font-heading">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage system users and monitor activity
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
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
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
            </div>
            <User className="w-8 h-8 text-muted-foreground" />
          </div>
        </div>
        
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Users</p>
              <p className="text-2xl font-bold mt-1 text-green-600">{stats.active}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Recently Active</p>
              <p className="text-2xl font-bold mt-1 text-blue-600">{stats.recentlyActive}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-600" />
          </div>
            <p className="text-xs text-muted-foreground mt-2">Last 24 hours</p>
          </div>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="bg-card rounded-lg border border-border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              {isAdmin && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">
                      {user.full_name || 'No name'}
                    </span>
                    {user.id === currentUser?.id && (
                      <Badge variant="outline" className="text-xs">You</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{user.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={cn(getRoleBadgeColor(user.role))}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {user.is_active && isCurrentlyActive(user.last_login) ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-600 font-medium">Active</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span className="text-sm text-red-600">Inactive</span>
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {user.last_login ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span title={formatLastLoginGMT8(user.last_login)}>
                        {formatLastLoginGMT8(user.last_login)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Never</span>
                  )}
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setPermissionsEditorOpen(true);
                      }}
                      className="gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      Permissions
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            </TableBody>
          </Table>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p className="font-semibold mb-2">Role Permissions:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li><strong>Admin:</strong> Full access, can manage users and all data</li>
              <li><strong>Manager:</strong> Can view and edit data, cannot manage users</li>
              <li><strong>User:</strong> Can view and add data, limited editing</li>
              <li><strong>Viewer:</strong> Read-only access</li>
            </ul>
            {isAdmin && (
              <p className="mt-3 text-xs italic">
                💡 Tip: Use the "Permissions" button to override role-based permissions for individual users.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Permissions Editor Dialog */}
      {selectedUser && (
        <UserPermissionsEditor
          userId={selectedUser.id}
          userName={selectedUser.full_name || selectedUser.email}
          userRole={selectedUser.role}
          open={permissionsEditorOpen}
          onOpenChange={setPermissionsEditorOpen}
          onPermissionsUpdated={() => {
            loadUsers();
            // If editing own permissions, refresh auth context
            if (selectedUser.id === currentUser?.id) {
              // The editor will handle refreshing permissions
            }
          }}
        />
      )}
    </div>
  );
}

