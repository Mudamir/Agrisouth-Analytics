/**
 * Data Logs Component
 * 
 * Shows recent database updates (additions and deletions)
 * Tracks who last updated the database and what they added or deleted
 * Auto-refreshes every 15 seconds
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { formatLastLoginGMT8 } from '@/lib/users';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Database, User, Package, Calendar, RefreshCw, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface DatabaseUpdateLog {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string;
  record_id: string;
  pack: string;
  container: string;
  cartons: number;
  etd: string;
  added_at: string;
  action: 'ADDED' | 'DELETED' | 'UPDATED';
}

export function DataLogs() {
  const { user: currentUser, canAccessPage } = useAuth();
  const [updateLogs, setUpdateLogs] = useState<DatabaseUpdateLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logsError, setLogsError] = useState('');

  useEffect(() => {
    // Check if user has permission to view this page
    if (!canAccessPage('data-logs')) {
      setLogsError('Access denied. You do not have permission to view data logs.');
      setLoadingLogs(false);
      return;
    }

    loadUpdateLogs();

    // Set up auto-refresh every 15 seconds (silent refresh - no loading indicator)
    const interval = setInterval(() => {
      loadUpdateLogs(true); // Silent refresh
    }, 15000); // Refresh every 15 seconds

      // Set up Supabase real-time subscription for data_activity_log
      let activityChannel: any = null;
      
      if (supabase) {
        // Subscribe to data_activity_log changes (unified table)
        activityChannel = supabase
          .channel('data_activity_log_changes')
          .on(
            'postgres_changes',
            {
              event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
              schema: 'public',
              table: 'data_activity_log',
            },
            (payload) => {
              console.log('Database activity change detected:', payload);
              // Reload logs when changes are detected (silent refresh)
              loadUpdateLogs(true);
            }
          )
          .subscribe();
      }

    // Cleanup function
    return () => {
      clearInterval(interval);
      if (activityChannel && supabase) {
        supabase.removeChannel(activityChannel);
      }
    };
  }, [canAccessPage]);

  async function loadUpdateLogs(silent = false) {
    try {
      if (!silent) {
        setLoadingLogs(true);
      }
      setLogsError('');
      
      if (!supabase) {
        setLogsError('Database not configured');
        setLoadingLogs(false);
        return;
      }

      // Fetch from unified data_activity_log table
      // IMPORTANT: Fetch ALL logs for ALL users - no user filtering
      // All users with Data Logs access should see the same activity logs
      const { data: activityLogs, error: activityError } = await supabase
        .from('data_activity_log')
        .select('*')
        .order('action_timestamp', { ascending: false })
        .limit(100); // Increased limit to show more recent activity

      if (activityError) {
        // Check if table doesn't exist (migration needed)
        if (activityError.code === '42P01' || activityError.message?.includes('does not exist')) {
          setLogsError('Activity log table not found. Please run the migration script: create-data-activity-log-table.sql');
        } else {
          console.error('Error loading activity logs:', activityError);
          setLogsError('Failed to load database activity logs');
        }
        setUpdateLogs([]);
        setLoadingLogs(false);
        return;
      }

      if (!activityLogs || activityLogs.length === 0) {
        setUpdateLogs([]);
        setLoadingLogs(false);
        return;
      }

      // Get unique user IDs and fetch user profiles
      const userIds = [...new Set(activityLogs.map((log: any) => log.user_id))];
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      // Create map for quick lookup
      const userMap = new Map();
      if (profiles) {
        profiles.forEach(profile => {
          userMap.set(profile.id, {
            name: profile.full_name,
            email: profile.email,
          });
        });
      }

      // Format logs with user information
      // IMPORTANT: Show ALL logs from ALL users - no filtering by current user
      // All users with Data Logs access should see the same activity
      const formattedLogs: DatabaseUpdateLog[] = activityLogs
        .map((log: any) => {
          const userInfo = userMap.get(log.user_id);
          
          // Extract data from snapshot_data if denormalized fields are null
          const snapshot = log.snapshot_data || {};
          
          return {
            id: log.id,
            record_id: log.record_id,
            user_id: log.user_id,
            user_name: userInfo?.name || null,
            user_email: userInfo?.email || 'Unknown',
            pack: log.pack || snapshot.pack || 'N/A',
            container: log.container || snapshot.container || 'N/A',
            cartons: log.cartons || snapshot.cartons || 0,
            etd: log.etd || snapshot.etd || 'N/A',
            added_at: log.action_timestamp,
            action: log.action === 'INSERT' ? 'ADDED' : log.action === 'DELETE' ? 'DELETED' : 'UPDATED',
          };
        })
        .filter(log => log.container !== 'N/A'); // Only show logs with valid container info

      setUpdateLogs(formattedLogs);
    } catch (err: any) {
      console.error('Error loading activity logs:', err);
      setLogsError('An error occurred while loading database activity logs');
      setUpdateLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  }

  // Calculate statistics
  const now = Date.now();
  const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000); // 24 hours ago
  
  const updatesLast24Hours = updateLogs.filter(log => {
    const logTime = new Date(log.added_at).getTime();
    return logTime >= twentyFourHoursAgo;
  }).length;

  const additionsLast24Hours = updateLogs.filter(log => {
    const logTime = new Date(log.added_at).getTime();
    return log.action === 'ADDED' && logTime >= twentyFourHoursAgo;
  }).length;

  const deletionsLast24Hours = updateLogs.filter(log => {
    const logTime = new Date(log.added_at).getTime();
    return log.action === 'DELETED' && logTime >= twentyFourHoursAgo;
  }).length;

  // Show access denied message if user doesn't have permission
  if (!canAccessPage('data-logs')) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
          <p className="font-semibold">Access Denied</p>
          <p className="text-sm mt-1">You do not have permission to view data logs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-heading">Data Logs</h1>
          <p className="text-muted-foreground mt-1">
            Track who last updated the database and what they added or deleted
            <span className="ml-2 text-xs text-muted-foreground/70">(Auto-refreshes every 15 seconds)</span>
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Database className="w-4 h-4 mr-1" />
          {currentUser?.role === 'admin' ? 'Admin Only' : 'Manager Access'}
        </Badge>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Updates</p>
              <p className="text-2xl font-bold mt-1 text-blue-600">{updatesLast24Hours}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">Last 24 hours</p>
        </div>
        
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Additions</p>
              <p className="text-2xl font-bold mt-1 text-green-600">{additionsLast24Hours}</p>
            </div>
            <Database className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">Last 24 hours</p>
        </div>
        
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Deletions</p>
              <p className="text-2xl font-bold mt-1 text-red-600">{deletionsLast24Hours}</p>
            </div>
            <Database className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">Last 24 hours</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-heading">Recent Database Updates</h2>
          <p className="text-muted-foreground mt-1">
            Track who last updated the database and what they added or deleted
            <span className="ml-2 text-xs text-muted-foreground/70">(Auto-refreshes every 15 seconds)</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              setRefreshing(true);
              await loadUpdateLogs(false); // Full refresh with loading indicator
              setRefreshing(false);
            }}
            disabled={refreshing || loadingLogs}
            className="gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", (refreshing || loadingLogs) && "animate-spin")} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {logsError && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
          <p className="font-semibold">Error Loading Update Logs</p>
          <p className="mt-1">{logsError}</p>
          {logsError.includes('not found') && (
            <p className="mt-2 text-xs">
              Please run the migration script: <code className="bg-destructive/20 px-1 rounded">create-data-activity-log-table.sql</code>
            </p>
          )}
        </div>
      )}

      <div className="bg-card rounded-lg border border-border shadow-sm">
        {loadingLogs ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-muted-foreground text-sm">Loading update logs...</p>
            </div>
          </div>
        ) : logsError && logsError.includes('not found') ? (
          <div className="p-8 text-center text-muted-foreground">
            <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-semibold mb-2">Activity Log Table Not Found</p>
            <p className="text-sm">Please run the migration script: create-data-activity-log-table.sql in Supabase to track database updates.</p>
          </div>
        ) : updateLogs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No database updates logged yet.</p>
            <p className="text-sm mt-2">Updates will appear here once users start adding records.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Pack</TableHead>
                <TableHead>Container #</TableHead>
                <TableHead>Cartons</TableHead>
                <TableHead>ETD</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {updateLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Badge 
                        className={cn(
                          log.action === 'ADDED' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : log.action === 'DELETED'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        )}
                      >
                        {log.action === 'ADDED' ? 'Added' : log.action === 'DELETED' ? 'Deleted' : 'Updated'}
                      </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <span className="font-medium block">
                          {log.user_name || 'No name'}
                        </span>
                        <span className="text-xs text-muted-foreground">{log.user_email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{log.pack}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-mono">{log.container}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">{log.cartons.toLocaleString()}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{log.etd}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span title={formatLastLoginGMT8(log.added_at)}>
                        {formatLastLoginGMT8(log.added_at)}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

