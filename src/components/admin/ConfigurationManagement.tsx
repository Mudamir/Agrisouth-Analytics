/**
 * Configuration Management Component
 * 
 * Allows managers to manage dropdown values for:
 * - POL (Port of Loading)
 * - Destination
 * - Supplier (separate for Bananas and Pineapples)
 * - S.Line (Shipping Line)
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Shield, Plus, Trash2, Settings, Save, MapPin, Ship, Package, Banana, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PineappleIcon } from '@/components/dashboard/PineappleIcon';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type ConfigType = 'pol' | 'destination' | 'supplier_bananas' | 'supplier_pineapples' | 's_line';

interface ConfigValue {
  id: string;
  type: ConfigType;
  value: string;
  created_at: string;
}

export function ConfigurationManagement() {
  const { isAdmin, userRole } = useAuth();
  const [configs, setConfigs] = useState<ConfigValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newValue, setNewValue] = useState<{ type: ConfigType; value: string }>({
    type: 'pol',
    value: '',
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<ConfigValue | null>(null);

  useEffect(() => {
    // Allow admin, manager, and user roles to access configuration
    // VIEWER role is restricted (handled by canAccessConfiguration in Index.tsx)
    if (!isAdmin && userRole !== 'manager' && userRole !== 'user') {
      setError('Access denied. Only admins, managers, and users can manage configuration.');
      setLoading(false);
      return;
    }
    loadConfigs();
  }, [isAdmin, userRole]);

  async function loadConfigs() {
    try {
      setLoading(true);
      if (!supabase) {
        setError('Database not configured');
        setLoading(false);
        return;
      }

      // Check if table exists, if not, create default values
      const { data, error: fetchError } = await supabase
        .from('configuration_values')
        .select('*')
        .order('type')
        .order('value');

      if (fetchError) {
        // Table doesn't exist, initialize with default values
        if (fetchError.code === '42P01') {
          await initializeDefaultConfigs();
          return;
        }
        throw fetchError;
      }

      setConfigs(data || []);
      setError('');
    } catch (err: any) {
      console.error('Error loading configs:', err);
      setError('Failed to load configuration values');
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  }

  async function initializeDefaultConfigs() {
    if (!supabase) return;

    const defaultConfigs = [
      { type: 'pol', value: 'DVO' },
      { type: 'pol', value: 'GES' },
      { type: 'destination', value: 'DAMMAM' },
      { type: 'supplier_bananas', value: 'AGS PANABO' },
      { type: 'supplier_bananas', value: 'AGS SARAP' },
      { type: 'supplier_bananas', value: 'AGS TUPI' },
      { type: 'supplier_bananas', value: 'ARR AGRI' },
      { type: 'supplier_bananas', value: 'LAPANDAY' },
      { type: 'supplier_bananas', value: 'MARSMAN' },
      { type: 'supplier_bananas', value: 'MARSMAN 2' },
      { type: 'supplier_bananas', value: 'NEW TOWN FRESH' },
      { type: 'supplier_bananas', value: 'SANTITO' },
      { type: 'supplier_bananas', value: 'UNIFRUTTI' },
      { type: 'supplier_pineapples', value: 'LAPANDAY' },
      { type: 'supplier_pineapples', value: 'PHILPACK' },
      { type: 's_line', value: 'CMA' },
      { type: 's_line', value: 'MSC' },
      { type: 's_line', value: 'ONE' },
      { type: 's_line', value: 'PIL' },
    ];

    try {
      const { error: insertError } = await supabase
        .from('configuration_values')
        .insert(defaultConfigs);

      if (insertError) throw insertError;
      
      toast.success('Configuration initialized with default values');
      await loadConfigs();
    } catch (err: any) {
      console.error('Error initializing configs:', err);
      setError('Failed to initialize configuration. Please create the configuration_values table in Supabase.');
    }
  }

  async function handleAdd() {
    if (!newValue.value.trim()) {
      toast.error('Please enter a value');
      return;
    }

    if (!supabase) {
      toast.error('Database not configured');
      return;
    }

    try {
      const { error } = await supabase
        .from('configuration_values')
        .insert({
          type: newValue.type,
          value: newValue.value.trim(),
        });

      if (error) throw error;

      toast.success('Configuration value added');
      setNewValue({ type: newValue.type, value: '' });
      await loadConfigs();
    } catch (err: any) {
      console.error('Error adding config:', err);
      toast.error('Failed to add configuration value');
    }
  }

  async function handleDelete() {
    if (!configToDelete || !supabase) return;

    try {
      const { error } = await supabase
        .from('configuration_values')
        .delete()
        .eq('id', configToDelete.id);

      if (error) throw error;

      toast.success('Configuration value deleted');
      setDeleteDialogOpen(false);
      setConfigToDelete(null);
      await loadConfigs();
    } catch (err: any) {
      console.error('Error deleting config:', err);
      toast.error('Failed to delete configuration value');
    }
  }

  const getConfigTypeLabel = (type: ConfigType): string => {
    switch (type) {
      case 'pol':
        return 'POL';
      case 'destination':
        return 'Destination';
      case 'supplier_bananas':
        return 'Supplier (Bananas)';
      case 'supplier_pineapples':
        return 'Supplier (Pineapples)';
      case 's_line':
        return 'S.Line';
      default:
        return type;
    }
  };

  const getConfigTypeBadgeColor = (type: ConfigType): string => {
    switch (type) {
      case 'pol':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50';
      case 'destination':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50';
      case 'supplier_bananas':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800/50';
      case 'supplier_pineapples':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border border-orange-200 dark:border-orange-800/50';
      case 's_line':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300 border border-gray-200 dark:border-gray-800/50';
    }
  };

  const getConfigTypeIcon = (type: ConfigType) => {
    switch (type) {
      case 'pol':
        return MapPin;
      case 'destination':
        return Ship;
      case 'supplier_bananas':
        return Banana;
      case 'supplier_pineapples':
        return PineappleIcon;
      case 's_line':
        return Package;
      default:
        return Settings;
    }
  };

  const getConfigTypeIconColor = (type: ConfigType): string => {
    switch (type) {
      case 'pol':
        return 'text-blue-600 dark:text-blue-400';
      case 'destination':
        return 'text-purple-600 dark:text-purple-400';
      case 'supplier_bananas':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'supplier_pineapples':
        return 'text-orange-600 dark:text-orange-400';
      case 's_line':
        return 'text-emerald-600 dark:text-emerald-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getConfigTypeBgColor = (type: ConfigType): string => {
    switch (type) {
      case 'pol':
        return 'bg-blue-500/10 border-blue-500/20';
      case 'destination':
        return 'bg-purple-500/10 border-purple-500/20';
      case 'supplier_bananas':
        return 'bg-yellow-500/10 border-yellow-500/20';
      case 'supplier_pineapples':
        return 'bg-orange-500/10 border-orange-500/20';
      case 's_line':
        return 'bg-emerald-500/10 border-emerald-500/20';
      default:
        return 'bg-gray-500/10 border-gray-500/20';
    }
  };

  const groupedConfigs = {
    pol: configs.filter(c => c.type === 'pol'),
    destination: configs.filter(c => c.type === 'destination'),
    supplier_bananas: configs.filter(c => c.type === 'supplier_bananas'),
    supplier_pineapples: configs.filter(c => c.type === 'supplier_pineapples'),
    s_line: configs.filter(c => c.type === 's_line'),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading configuration...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin && userRole !== 'manager' && userRole !== 'user') {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
          <p className="font-semibold">Access Denied</p>
          <p className="text-sm mt-1">Only admins, managers, and users can manage configuration.</p>
        </div>
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
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold font-heading text-foreground tracking-tight">Configuration Management</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Manage dropdown values for POL, Destination, Suppliers, and S.Line
              </p>
            </div>
          </div>
        </div>
        <Badge variant="outline" className="text-sm border-border/60">
          <Shield className="w-4 h-4 mr-1" />
          {isAdmin ? 'Admin Access' : userRole === 'manager' ? 'Manager Access' : 'User Access'}
        </Badge>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
          {error.includes('table') && (
            <p className="mt-2 text-xs">
              Please create the <code className="bg-destructive/20 px-1 rounded">configuration_values</code> table in Supabase with columns: id (uuid), type (text), value (text), created_at (timestamptz).
            </p>
          )}
        </div>
      )}

      {/* Premium Add New Value Card */}
      <div className="bg-gradient-to-br from-card to-card/80 rounded-2xl border border-border/50 p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
            <Plus className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Add New Value</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">Type</Label>
            <Select
              value={newValue.type}
              onValueChange={(value) => setNewValue({ ...newValue, type: value as ConfigType })}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pol">POL</SelectItem>
                <SelectItem value="destination">Destination</SelectItem>
                <SelectItem value="supplier_bananas">Supplier (Bananas)</SelectItem>
                <SelectItem value="supplier_pineapples">Supplier (Pineapples)</SelectItem>
                <SelectItem value="s_line">S.Line</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">Value</Label>
            <Input
              value={newValue.value}
              onChange={(e) => setNewValue({ ...newValue, value: e.target.value })}
              placeholder="Enter configuration value"
              className="h-10"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAdd();
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground opacity-0">&nbsp;</Label>
            <Button 
              onClick={handleAdd} 
              className="w-full h-10 bg-primary hover:bg-primary/90 shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Value
            </Button>
          </div>
        </div>
      </div>

      {/* Premium Configuration Cards - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(groupedConfigs).map(([type, values]) => {
          const Icon = getConfigTypeIcon(type as ConfigType);
          const configType = type as ConfigType;
          
          return (
            <div 
              key={type} 
              className="bg-card rounded-2xl border border-border/50 shadow-xl overflow-hidden"
            >
              {/* Card Header */}
              <div className="bg-gradient-to-r from-muted/80 via-muted/60 to-muted/80 border-b-2 border-border/60 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center border-2 shadow-sm",
                      getConfigTypeBgColor(configType)
                    )}>
                      <Icon className={cn('w-5 h-5', getConfigTypeIconColor(configType))} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-foreground tracking-wide">
                        {getConfigTypeLabel(configType)}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {values.length} {values.length === 1 ? 'value' : 'values'}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    className={cn("font-semibold px-3 py-1 text-xs", getConfigTypeBadgeColor(configType))}
                  >
                    {values.length}
                  </Badge>
                </div>
              </div>

              {/* Card Content */}
              {values.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 rounded-xl bg-muted/40 flex items-center justify-center mx-auto mb-3">
                    <Icon className="w-6 h-6 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">No values configured</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Add values using the form above</p>
                </div>
              ) : (
                <div className="max-h-[450px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 border-b border-border/40">
                        <TableHead className="px-4 py-3 font-semibold text-foreground">Value</TableHead>
                        <TableHead className="text-right w-20 px-4 py-3 font-semibold text-foreground">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {values.map((config, index) => (
                        <TableRow 
                          key={config.id}
                          className={cn(
                            "hover:bg-muted/40 transition-all duration-200 border-b border-border/30",
                            index % 2 === 0 ? "bg-card" : "bg-muted/20"
                          )}
                        >
                          <TableCell className="px-4 py-3">
                            <span className="font-medium text-sm text-foreground">{config.value}</span>
                          </TableCell>
                          <TableCell className="text-right px-4 py-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setConfigToDelete(config);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{configToDelete?.value}"? This will remove it from the dropdown options.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setConfigToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


