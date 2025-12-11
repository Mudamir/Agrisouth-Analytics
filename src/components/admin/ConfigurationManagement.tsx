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
import { Shield, Plus, Trash2, Settings, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
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
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'destination':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'supplier_bananas':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'supplier_pineapples':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 's_line':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800';
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
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">Configuration Management</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage dropdown values for POL, Destination, Suppliers, and S.Line
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
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

      {/* Add New Value */}
      <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add New Value
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Type</Label>
            <select
              value={newValue.type}
              onChange={(e) => setNewValue({ ...newValue, type: e.target.value as ConfigType })}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="pol">POL</option>
              <option value="destination">Destination</option>
              <option value="supplier_bananas">Supplier (Bananas)</option>
              <option value="supplier_pineapples">Supplier (Pineapples)</option>
              <option value="s_line">S.Line</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Value</Label>
            <Input
              value={newValue.value}
              onChange={(e) => setNewValue({ ...newValue, value: e.target.value })}
              placeholder="Enter value"
              className="h-9"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAdd();
                }
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs opacity-0">&nbsp;</Label>
            <Button onClick={handleAdd} className="w-full h-9">
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </div>
      </div>

      {/* Configuration Tables - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Object.entries(groupedConfigs).map(([type, values]) => (
          <div key={type} className="bg-card rounded-lg border border-border shadow-sm">
            <div className="p-3 border-b border-border">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Settings className="w-4 h-4" />
                {getConfigTypeLabel(type as ConfigType)}
                <Badge variant="outline" className="ml-auto text-xs">
                  {values.length} values
                </Badge>
              </h3>
            </div>
            {values.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <p className="text-xs">No values configured. Add values using the form above.</p>
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Value</TableHead>
                      <TableHead className="text-right w-16">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {values.map((config) => (
                      <TableRow key={config.id}>
                        <TableCell>
                          <span className="font-medium text-sm">{config.value}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setConfigToDelete(config);
                              setDeleteDialogOpen(true);
                            }}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
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
        ))}
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


