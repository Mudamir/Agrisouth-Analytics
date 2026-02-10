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
import { Database, User, Package, Calendar, RefreshCw, TrendingUp, Plus, Minus, Edit, Clock, Activity, Shield, Apple } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface DatabaseUpdateLog {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string;
  record_id: string;
  pack: string;
  container: string;
  cartons: number;
  item: string;
  added_at: string;
  action: 'ADDED' | 'DELETED' | 'UPDATED';
}

export function DataLogs() {
  const { user: currentUser, canAccessPage } = useAuth();
  const [updateLogs, setUpdateLogs] = useState<DatabaseUpdateLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logsError, setLogsError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 50;

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
  }, [canAccessPage, currentPage]);

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

      // Fetch total count first
      const { count: totalCountResult } = await supabase
        .from('data_activity_log')
        .select('*', { count: 'exact', head: true });
      
      setTotalCount(totalCountResult || 0);

      // Calculate pagination range
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      // Fetch from unified data_activity_log table with pagination
      // IMPORTANT: Fetch ALL logs for ALL users - no user filtering
      // All users with Data Logs access should see the same activity logs
      // Always fetch fresh data (no cache) by using a unique query each time
      const { data: activityLogs, error: activityError } = await supabase
        .from('data_activity_log')
        .select('*')
        .order('action_timestamp', { ascending: false })
        .range(from, to);

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
            item: log.item || snapshot.item || 'N/A',
            added_at: log.action_timestamp,
            action: log.action === 'INSERT' ? 'ADDED' : log.action === 'DELETE' ? 'DELETED' : 'UPDATED',
          };
        })
        // Show all logs, even if some fields are missing
        .sort((a, b) => {
          // Ensure logs are sorted by timestamp (newest first) as a fallback
          return new Date(b.added_at).getTime() - new Date(a.added_at).getTime();
        });

      // Always update state to trigger re-render with latest data
      setUpdateLogs([...formattedLogs]);
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
      {/* Premium Header Design */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div>
            <h1 className="text-3xl font-bold font-heading text-foreground tracking-tight">Data Logs</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Track database updates and user activity
              <span className="ml-2 text-xs text-muted-foreground/70">(Auto-refreshes every 15 seconds)</span>
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-sm border-border/60">
          <Shield className="w-4 h-4 mr-1" />
          {currentUser?.role === 'admin' ? 'Admin Only' : 'Manager Access'}
        </Badge>
      </div>

      {/* Premium Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="group relative bg-gradient-to-br from-blue-50/50 dark:from-blue-950/20 to-card rounded-2xl border border-blue-500/20 p-6 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Total Updates</p>
              <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{updatesLast24Hours}</p>
              <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
            </div>
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 border border-blue-500/30 flex items-center justify-center shadow-md">
              <TrendingUp className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
        
        <div className="group relative bg-gradient-to-br from-emerald-50/50 dark:from-emerald-950/20 to-card rounded-2xl border border-emerald-500/20 p-6 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Additions</p>
              <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">{additionsLast24Hours}</p>
              <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
            </div>
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-md">
              <Plus className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>
        
        <div className="group relative bg-gradient-to-br from-red-50/50 dark:from-red-950/20 to-card rounded-2xl border border-red-500/20 p-6 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Deletions</p>
              <p className="text-4xl font-bold text-red-600 dark:text-red-400">{deletionsLast24Hours}</p>
              <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
            </div>
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500/20 to-red-500/10 border border-red-500/30 flex items-center justify-center shadow-md">
              <Minus className="w-7 h-7 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Table Section Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold font-heading text-foreground tracking-tight">Recent Activity</h2>
          <p className="text-sm text-muted-foreground">
            Complete audit trail of all database changes
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            setRefreshing(true);
            // Reset to page 1 and force a full refresh
            setCurrentPage(1);
            setUpdateLogs([]);
            await loadUpdateLogs(false);
            setRefreshing(false);
          }}
          disabled={refreshing || loadingLogs}
          className="gap-2 hover:bg-primary hover:text-primary-foreground transition-all duration-200 shadow-sm"
        >
          <RefreshCw className={cn("w-4 h-4", (refreshing || loadingLogs) && "animate-spin")} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
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

      {/* Premium Table Design */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-xl overflow-hidden">
        {loadingLogs ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center space-y-4">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-muted-foreground text-sm font-medium">Loading activity logs...</p>
            </div>
          </div>
        ) : logsError && logsError.includes('not found') ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-xl bg-muted/40 flex items-center justify-center mx-auto mb-4">
              <Database className="w-8 h-8 text-muted-foreground/60" />
            </div>
            <p className="font-semibold text-foreground mb-2">Activity Log Table Not Found</p>
            <p className="text-sm text-muted-foreground">Please run the migration script: create-data-activity-log-table.sql in Supabase to track database updates.</p>
          </div>
        ) : updateLogs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-xl bg-muted/40 flex items-center justify-center mx-auto mb-4">
              <Database className="w-8 h-8 text-muted-foreground/60" />
            </div>
            <p className="font-semibold text-foreground mb-2">No Activity Logs</p>
            <p className="text-sm text-muted-foreground">Updates will appear here once users start adding or deleting records.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-muted/80 via-muted/60 to-muted/80 border-b-2 border-border/60 hover:bg-muted/80">
                  <TableHead className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-bold text-foreground tracking-wide">Action</span>
                    </div>
                  </TableHead>
                  <TableHead className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-bold text-foreground tracking-wide">User</span>
                    </div>
                  </TableHead>
                  <TableHead className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-bold text-foreground tracking-wide">Pack</span>
                    </div>
                  </TableHead>
                  <TableHead className="px-6 py-4">
                    <span className="text-sm font-bold text-foreground tracking-wide">Container #</span>
                  </TableHead>
                  <TableHead className="px-6 py-4">
                    <span className="text-sm font-bold text-foreground tracking-wide">Cartons</span>
                  </TableHead>
                  <TableHead className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Apple className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-bold text-foreground tracking-wide">Item Type</span>
                    </div>
                  </TableHead>
                  <TableHead className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-bold text-foreground tracking-wide">Date</span>
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {updateLogs.map((log, index) => (
                  <TableRow 
                    key={log.id}
                    className={cn(
                      "hover:bg-muted/40 transition-all duration-200 border-b border-border/30 group",
                      index % 2 === 0 ? "bg-card" : "bg-muted/20"
                    )}
                  >
                    <TableCell className="px-6 py-4">
                      <Badge 
                        className={cn(
                          "font-semibold px-3 py-1 text-xs flex items-center gap-1.5 w-fit",
                          log.action === 'ADDED' 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50' 
                            : log.action === 'DELETED'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800/50'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50'
                        )}
                      >
                        {log.action === 'ADDED' ? (
                          <>
                            <Plus className="w-3 h-3" />
                            Added
                          </>
                        ) : log.action === 'DELETED' ? (
                          <>
                            <Minus className="w-3 h-3" />
                            Deleted
                          </>
                        ) : (
                          <>
                            <Edit className="w-3 h-3" />
                            Updated
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 via-primary/15 to-secondary/15 flex items-center justify-center flex-shrink-0 border-2 border-primary/30 shadow-sm">
                          <span className="text-sm font-bold text-primary">
                            {(log.user_name || log.user_email).charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-foreground truncate">
                            {log.user_name || 'No name'}
                          </div>
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={log.user_email}>
                            {log.user_email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-muted-foreground/60" />
                        <span className="text-sm font-medium text-foreground">{log.pack}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <span className="text-sm font-mono font-medium text-foreground bg-muted/30 px-2 py-1 rounded border border-border/50">
                        {log.container}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <span className="text-sm font-semibold text-foreground">{log.cartons.toLocaleString()}</span>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {log.item && log.item !== 'N/A' ? (
                        <span className="text-sm font-medium text-foreground">
                          {log.item === 'BANANAS' ? 'Bananas' : 'Pineapples'}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground/60" />
                        <span 
                          className="text-foreground/80 font-medium"
                          title={formatLastLoginGMT8(log.added_at)}
                        >
                          {formatLastLoginGMT8(log.added_at)}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {updateLogs.length > 0 && (() => {
          const totalPages = Math.ceil(totalCount / itemsPerPage);
          const startRecord = (currentPage - 1) * itemsPerPage + 1;
          const endRecord = Math.min(currentPage * itemsPerPage, totalCount);

          return totalPages > 1 ? (
            <div className="px-6 py-4 border-t border-border/50 bg-muted/20">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {startRecord} to {endRecord} of {totalCount} records
                </p>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage > 1) {
                            setCurrentPage(prev => prev - 1);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }
                        }}
                        className={cn(currentPage === 1 && 'pointer-events-none opacity-50')}
                      />
                    </PaginationItem>
                    
                    {/* Page Numbers */}
                    {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 7) {
                        pageNum = i + 1;
                      } else if (currentPage <= 4) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 3) {
                        pageNum = totalPages - 6 + i;
                      } else {
                        pageNum = currentPage - 3 + i;
                      }
                      
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(pageNum);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            isActive={currentPage === pageNum}
                            className="cursor-pointer"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    
                    {totalPages > 7 && currentPage < totalPages - 3 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage < totalPages) {
                            setCurrentPage(prev => prev + 1);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }
                        }}
                        className={cn(currentPage === totalPages && 'pointer-events-none opacity-50')}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          ) : null;
        })()}
      </div>
    </div>
  );
}

