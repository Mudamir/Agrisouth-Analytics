import { useState, useMemo, useEffect } from 'react';
import { ShippingRecord, FruitType } from '@/types/shipping';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, DatabaseShippingRecord } from '@/lib/supabase';
import { useConfiguration } from '@/hooks/useConfiguration';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Plus, Trash2, Download, Search, X, CalendarIcon, AlertCircle, CheckCircle2, Lock, Package, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

interface DataViewProps {
  data: ShippingRecord[];
  onAdd: (record: Omit<ShippingRecord, 'id'>) => void;
  onDelete: (id: string) => void;
}

// Pack options remain hardcoded as they're product-specific
const bananaPacks = ['13.5 KG A', '13.5 KG B', '13.5 KG SH', '7KG', '6KG', '3KG', '18KG'];
const pineapplePacks = ['7C', '8C', '9C', '10C', '12C'];

export function DataView({ data, onAdd, onDelete }: DataViewProps) {
  const { getPols, getDestinations, getBananaSuppliers, getPineappleSuppliers, getSLines, isLoading: configLoading } = useConfiguration();
  const { userRole } = useAuth();
  const isViewer = userRole === 'viewer';
  const [isOpen, setIsOpen] = useState(false);
  const [filterItem, setFilterItem] = useState<FruitType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateRecords, setDuplicateRecords] = useState<ShippingRecord[]>([]);
  const [pendingLock, setPendingLock] = useState(false); // Track if user wants to lock after acknowledging duplicate
  const [isAddingRecord, setIsAddingRecord] = useState(false); // Track if this is from adding a record (should block) vs locking (can proceed)
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  
  const [newRecord, setNewRecord] = useState({
    year: new Date().getFullYear(),
    week: 1,
    etd: '',
    etdDate: undefined as Date | undefined,
    pol: '',
    item: 'BANANAS' as FruitType,
    destination: '',
    supplier: '',
    sLine: '',
    container: '',
    pack: '',
    lCont: 1,
    cartons: 0,
    price: 8.65,
    type: 'CONTRACT' as 'CONTRACT' | 'SPOT',
  });

  // Container mode state - for adding multiple packs to one container
  const [containerMode, setContainerMode] = useState(false);
  const [containerInfoLocked, setContainerInfoLocked] = useState(false);
  const [containerTotalCartons, setContainerTotalCartons] = useState<number | ''>('');
  const [packEntries, setPackEntries] = useState<Array<{ pack: string; cartons: number; price: number }>>([]);
  const [currentPackEntry, setCurrentPackEntry] = useState({ pack: '', cartons: 0, price: 8.65 });

  // Delete confirmation modal state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<ShippingRecord | null>(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  
  const { user } = useAuth();

  // Filter by item type
  const itemFilteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return filterItem === 'ALL' ? data : data.filter(r => r.item === filterItem);
  }, [data, filterItem]);

  // Search functionality - searches across multiple fields (instant updates)
  const searchedData = useMemo(() => {
    let filtered = itemFilteredData;
    
    // Apply dropdown filters first
    if (selectedYear) {
      filtered = filtered.filter(record => record.year === parseInt(selectedYear));
    }
    if (selectedWeek) {
      filtered = filtered.filter(record => record.week === parseInt(selectedWeek));
    }
    if (selectedSupplier) {
      filtered = filtered.filter(record => record.supplier === selectedSupplier);
    }
    
    // Then apply text search
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return filtered;
    
    const query = trimmedQuery.toLowerCase();
    // Use a single pass filter for better performance
    return filtered.filter(record => {
      // Check all searchable fields in one pass
      return (
        record.container.toLowerCase().includes(query) ||
        record.supplier.toLowerCase().includes(query) ||
        record.pack.toLowerCase().includes(query) ||
        record.sLine.toLowerCase().includes(query) ||
        record.pol.toLowerCase().includes(query) ||
        record.destination.toLowerCase().includes(query) ||
        record.item.toLowerCase().includes(query) ||
        String(record.year).includes(query) ||
        String(record.week).includes(query) ||
        String(record.cartons).includes(query)
      );
    });
  }, [itemFilteredData, searchQuery, selectedYear, selectedWeek, selectedSupplier]);

  // Pagination - memoized for instant updates
  const totalPages = useMemo(() => Math.ceil(searchedData.length / itemsPerPage), [searchedData.length, itemsPerPage]);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return searchedData.slice(startIndex, endIndex);
  }, [searchedData, currentPage, itemsPerPage]);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterItem]);

  // Filter packs and suppliers based on selected item
  const packs = useMemo(() => {
    return newRecord.item === 'BANANAS' ? bananaPacks : pineapplePacks;
  }, [newRecord.item]);

  const suppliers = useMemo(() => {
    return newRecord.item === 'BANANAS' ? getBananaSuppliers() : getPineappleSuppliers();
  }, [newRecord.item, getBananaSuppliers, getPineappleSuppliers]);

  const pols = useMemo(() => getPols(), [getPols]);
  const sLines = useMemo(() => getSLines(), [getSLines]);
  const destinations = useMemo(() => getDestinations(), [getDestinations]);

  // Get unique years, weeks, and suppliers from data for dropdowns
  const uniqueYears = useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...new Set(data.map(r => r.year))].sort((a, b) => b - a);
  }, [data]);

  const uniqueWeeks = useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...new Set(data.map(r => r.week))].sort((a, b) => a - b);
  }, [data]);

  const uniqueSuppliers = useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...new Set(data.map(r => r.supplier))].sort();
  }, [data]);

  // Check if all required fields for container mode are filled
  const isContainerModeReady = useMemo(() => {
    return !!(
      newRecord.year &&
      newRecord.week &&
      newRecord.etdDate &&
      newRecord.pol &&
      newRecord.item &&
      newRecord.destination &&
      newRecord.supplier &&
      newRecord.sLine &&
      newRecord.container.trim()
    );
  }, [newRecord]);

  // Check for existing records with same container and ETD
  const existingRecordsForContainer = useMemo(() => {
    if (!newRecord.container || !newRecord.etdDate) return [];
    const etdStr = format(newRecord.etdDate, 'MM/dd/yyyy');
    return data.filter(r => 
      r.container.toUpperCase() === newRecord.container.trim().toUpperCase() && 
      r.etd === etdStr
    );
  }, [data, newRecord.container, newRecord.etdDate]);

  const existingCartonsTotal = useMemo(() => {
    return existingRecordsForContainer.reduce((sum, r) => sum + r.cartons, 0);
  }, [existingRecordsForContainer]);

  // Calculate total cartons from pack entries
  const totalPackCartons = useMemo(() => {
    return packEntries.reduce((sum, entry) => sum + (entry.cartons || 0), 0);
  }, [packEntries]);

  // Total cartons including existing records
  const totalCartonsIncludingExisting = useMemo(() => {
    return existingCartonsTotal + totalPackCartons;
  }, [existingCartonsTotal, totalPackCartons]);

  // Calculate load count for each pack entry
  // Load count = (Pack Cartons) / (Total Cartons in Container)
  // We use containerTotalCartons as the denominator (the actual container capacity)
  const calculateLoadCount = (cartons: number): number => {
    if (!containerTotalCartons || containerTotalCartons === 0) return 0;
    return roundTo(cartons / containerTotalCartons, 8);
  };

  // Round to avoid floating point issues
  const roundTo = (value: number, decimals: number): number => {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  };

  // Validation messages
  const validationMessage = useMemo(() => {
    if (!containerMode) return null;
    
    if (!containerTotalCartons || containerTotalCartons === 0) {
      return { type: 'error' as const, message: 'Please enter the total cartons in the container' };
    }
    
    if (existingRecordsForContainer.length > 0) {
      return { 
        type: 'warning' as const, 
        message: `⚠️ Found ${existingRecordsForContainer.length} existing record(s) for this container/ETD with ${existingCartonsTotal.toLocaleString()} cartons. New entries: ${totalPackCartons.toLocaleString()}. Total will be: ${totalCartonsIncludingExisting.toLocaleString()}` 
      };
    }
    
    if (packEntries.length === 0) {
      return { type: 'info' as const, message: 'Add pack entries below. Load count will be calculated automatically.' };
    }
    
    if (totalCartonsIncludingExisting > containerTotalCartons) {
      const difference = totalCartonsIncludingExisting - containerTotalCartons;
      return { 
        type: 'error' as const, 
        message: `Total cartons (${totalCartonsIncludingExisting.toLocaleString()}) exceeds container total (${containerTotalCartons.toLocaleString()}) by ${difference.toLocaleString()}` 
      };
    }
    
    if (totalCartonsIncludingExisting < containerTotalCartons) {
      const difference = containerTotalCartons - totalCartonsIncludingExisting;
      return { 
        type: 'warning' as const, 
        message: `Total cartons (${totalCartonsIncludingExisting.toLocaleString()}) is ${difference.toLocaleString()} less than container total (${containerTotalCartons.toLocaleString()})` 
      };
    }
    
    return { type: 'success' as const, message: `✓ All cartons accounted for (${totalCartonsIncludingExisting.toLocaleString()} = ${containerTotalCartons.toLocaleString()})` };
  }, [containerMode, containerTotalCartons, packEntries, totalPackCartons, existingRecordsForContainer.length, existingCartonsTotal, totalCartonsIncludingExisting]);

  // Enable container mode when all required fields are filled
  useEffect(() => {
    if (isContainerModeReady && !containerMode) {
      setContainerMode(true);
      setContainerInfoLocked(false); // Don't auto-lock, user must click button
      setContainerTotalCartons('');
      setPackEntries([]);
      setCurrentPackEntry({ pack: '', cartons: 0, price: 8.65 });
    } else if (!isContainerModeReady && containerMode) {
      setContainerMode(false);
      setContainerInfoLocked(false);
      setContainerTotalCartons('');
      setPackEntries([]);
    }
  }, [isContainerModeReady, containerMode]);

  const handleLockContainerInfo = async () => {
    if (!isContainerModeReady) {
      toast.error('Please fill in all required container fields');
      return;
    }

    // Check for duplicates before locking container info
    if (!newRecord.etdDate) {
      toast.error('Please select an ETD date');
      return;
    }

    const formattedDate = format(newRecord.etdDate, 'MM/dd/yyyy');
    const normalizedContainer = newRecord.container.trim().toUpperCase();

    console.log('🔒 Attempting to lock container:', {
      container: normalizedContainer,
      etd: formattedDate,
      dataAvailable: data.length > 0
    });

    // First check in local data
    let duplicates = checkForDuplicates(normalizedContainer, formattedDate);
    
    // Also check directly in database for more reliable results (always check DB, not just when local is empty)
    if (supabase) {
      try {
        // Query database for records with same Container and ETD (unique constraint)
        const { data: dbDuplicates, error } = await supabase
          .from('shipping_records')
          .select('*')
          .eq('container', normalizedContainer)
          .eq('etd', formattedDate);

        if (!error && dbDuplicates && dbDuplicates.length > 0) {
          console.log('⚠️ Found duplicates in database:', dbDuplicates);
          // Convert database records to ShippingRecord format for display
          const duplicateRecords: ShippingRecord[] = dbDuplicates.map((db: DatabaseShippingRecord) => ({
            id: db.id,
            year: db.year,
            week: db.week,
            etd: db.etd,
            pol: db.pol,
            item: db.item as FruitType,
            destination: db.destination,
            supplier: db.supplier,
            sLine: db.s_line,
            container: db.container,
            pack: db.pack,
            lCont: Number(db.l_cont),
            cartons: db.cartons,
            price: Number(db.price),
            type: (db.type || 'SPOT') as 'CONTRACT' | 'SPOT',
          }));
          // Merge with local duplicates, avoiding duplicates by ID
          const existingIds = new Set(duplicates.map(d => d.id));
          const newDuplicates = duplicateRecords.filter(d => !existingIds.has(d.id));
          duplicates = [...duplicates, ...newDuplicates];
        } else if (error) {
          console.error('Error checking database for duplicates:', error);
        }
      } catch (err) {
        console.error('Error checking database for duplicates:', err);
        // Continue with local check if DB check fails
      }
    }
    
    if (duplicates.length > 0) {
      console.log('⚠️ Duplicates found, showing dialog');
      // Show duplicate warning dialog - allow locking for review purposes
      setDuplicateRecords(duplicates);
      setPendingLock(true); // Mark that we want to lock after user acknowledges
      setIsAddingRecord(false); // This is from locking, not adding
      setDuplicateDialogOpen(true);
      return; // Don't lock if duplicate found - wait for user confirmation
    }

    console.log('✅ No duplicates found, locking container');
    // No duplicates found, safe to lock
    setContainerInfoLocked(true);
    toast.success('Container information locked');
  };

  const handleAddPackEntry = () => {
    if (!currentPackEntry.pack || !currentPackEntry.cartons || currentPackEntry.cartons <= 0) {
      toast.error('Please select a pack and enter cartons');
      return;
    }

    if (!containerTotalCartons || containerTotalCartons === 0) {
      toast.error('Please enter the total cartons in the container first');
      return;
    }

    if (totalCartonsIncludingExisting + currentPackEntry.cartons > containerTotalCartons) {
      toast.error(`Adding ${currentPackEntry.cartons.toLocaleString()} cartons would exceed the container total`);
      return;
    }

    setPackEntries([...packEntries, { ...currentPackEntry }]);
    setCurrentPackEntry({ pack: '', cartons: 0, price: 8.65 });
  };

  const handleRemovePackEntry = (index: number) => {
    setPackEntries(packEntries.filter((_, i) => i !== index));
  };

  // Check for duplicate records (same Container and ETD only - unique constraint)
  const checkForDuplicates = (container: string, etd: string): ShippingRecord[] => {
    if (!data || data.length === 0) {
      console.log('⚠️ No data available for duplicate check');
      return [];
    }

    const normalizedContainer = container.trim().toUpperCase();
    const normalizedEtd = etd.trim();
    
    console.log('🔍 Checking for duplicates (Container + ETD):', {
      container: normalizedContainer,
      etd: normalizedEtd,
      dataLength: data.length
    });
    
    const duplicates = data.filter(record => {
      if (!record.container || !record.etd) {
        return false;
      }

      const recordContainer = record.container.trim().toUpperCase();
      const recordEtd = record.etd.trim();
      
      const containerMatch = recordContainer === normalizedContainer;
      const etdMatch = recordEtd === normalizedEtd;
      
      const matches = containerMatch && etdMatch;
      
      if (matches) {
        console.log('✅ Found duplicate:', {
          recordContainer,
          recordEtd,
          inputContainer: normalizedContainer,
          inputEtd: normalizedEtd,
          recordId: record.id,
          recordPol: record.pol,
          recordPack: record.pack
        });
      }
      
      return matches;
    });
    
    console.log(`📊 Duplicate check result: ${duplicates.length} duplicate(s) found`);
    if (duplicates.length > 0) {
      console.log('Duplicate records:', duplicates.map(d => ({
        id: d.id,
        container: d.container,
        etd: d.etd,
        pol: d.pol,
        pack: d.pack
      })));
    }
    
    return duplicates;
  };

  const handleSubmit = async () => {
    if (!newRecord.etdDate) {
      toast.error('Please select an ETD date');
      return;
    }

    // Format date as MM/DD/YYYY
    const formattedDate = format(newRecord.etdDate, 'MM/dd/yyyy');
    const normalizedContainer = newRecord.container.trim().toUpperCase();

    if (containerMode) {
      // Container mode: validate and add all pack entries
      if (!containerTotalCartons || containerTotalCartons === 0) {
        toast.error('Please enter the total cartons in the container');
        return;
      }

      if (packEntries.length === 0) {
        toast.error('Please add at least one pack entry');
        return;
      }

      if (totalCartonsIncludingExisting !== containerTotalCartons) {
        toast.error(`Total cartons (${totalCartonsIncludingExisting.toLocaleString()}) must equal container total (${containerTotalCartons.toLocaleString()})`);
        return;
      }

      // Note: Duplicate check is done when locking container (handleLockContainerInfo)
      // No need to check again here since container must be locked before adding

      // Add all pack entries as separate records
      packEntries.forEach((entry) => {
        const loadCount = calculateLoadCount(entry.cartons);
        onAdd({
          year: newRecord.year,
          week: newRecord.week,
          etd: formattedDate,
          pol: newRecord.pol,
          item: newRecord.item,
          destination: newRecord.destination,
          supplier: newRecord.supplier,
          sLine: newRecord.sLine,
          container: normalizedContainer,
          pack: entry.pack,
          lCont: loadCount,
          cartons: entry.cartons,
          price: entry.price,
          type: newRecord.type,
        });
      });

      toast.success(`Successfully added ${packEntries.length} record(s) for container ${newRecord.container}`);
    } else {
      // Single record mode
      if (!newRecord.supplier || !newRecord.container || !newRecord.pack || !newRecord.cartons) {
        toast.error('Please fill in all required fields');
        return;
      }

      onAdd({
        ...newRecord,
        etd: formattedDate,
        container: normalizedContainer,
        type: newRecord.type,
      });
      toast.success('Record added successfully');
    }

    // Reset form
    setIsOpen(false);
    setNewRecord({
      year: new Date().getFullYear(),
      week: 1,
      etd: '',
      etdDate: undefined,
      pol: 'DVO',
      item: 'BANANAS',
      destination: '',
      supplier: '',
      sLine: 'CMA',
      container: '',
      pack: '',
      lCont: 1,
      cartons: 0,
      price: 8.65,
      type: 'CONTRACT',
    });
    setContainerMode(false);
    setContainerInfoLocked(false);
    setContainerTotalCartons('');
    setPackEntries([]);
    setCurrentPackEntry({ pack: '', cartons: 0, price: 8.65 });
  };

  const handleExport = () => {
      const headers = ['Year', 'Week', 'ETD', 'POL', 'Item', 'Destination', 'Supplier', 'S.Line', 'Container', 'Pack', 'L.Cont', 'Cartons', 'Price', 'Type'];
      const rows = searchedData.map(r => [
        r.year, r.week, r.etd, r.pol, r.item, r.destination, r.supplier, r.sLine, r.container, r.pack, r.lCont, r.cartons, r.price, r.type
      ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shipping_data_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success(`Exported ${searchedData.length} records successfully`);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedYear('');
    setSelectedWeek('');
    setSelectedSupplier('');
    setCurrentPage(1);
  };

  const handleConfirmDelete = async () => {
    if (!password) {
      setPasswordError('Please enter your password');
      return;
    }

    if (!recordToDelete) {
      setPasswordError('No record selected for deletion');
      return;
    }

    if (!user?.email) {
      setPasswordError('User not authenticated');
      return;
    }

    setIsVerifying(true);
    setPasswordError('');

    try {
      // Verify password by attempting to sign in
      if (!supabase) {
        setPasswordError('Database connection error');
        setIsVerifying(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });

      if (signInError) {
        setPasswordError('Incorrect password. Please try again.');
        setIsVerifying(false);
        return;
      }

      // Password is correct, proceed with deletion
      if (!recordToDelete.id) {
        setPasswordError('Record ID not found');
        setIsVerifying(false);
        return;
      }

      // Delete from database
      try {
        console.log('🗑️ Calling onDelete with ID:', recordToDelete.id);
        await onDelete(recordToDelete.id);
        console.log('✅ onDelete completed successfully');
      } catch (deleteError: any) {
        console.error('❌ Error deleting record from database:', {
          error: deleteError,
          message: deleteError?.message,
          stack: deleteError?.stack,
        });
        setPasswordError(deleteError.message || 'Failed to delete record from database');
        toast.error('Failed to delete record', {
          description: deleteError.message || 'The record could not be deleted. Please try again.',
        });
        setIsVerifying(false);
        return;
      }
      
      // Show success message
      toast.success('Record deleted successfully', {
        description: `${recordToDelete.item} - Week ${recordToDelete.week}, ${recordToDelete.year}`,
        duration: 3000,
      });
      
      // Small delay for better UX (user sees success state)
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Reset state and close dialog
      setDeleteDialogOpen(false);
      setPassword('');
      setPasswordError('');
      setRecordToDelete(null);
    } catch (error: any) {
      console.error('Error in delete process:', error);
      setPasswordError(error.message || 'An error occurred. Please try again.');
      toast.error('Failed to delete record', {
        description: error.message || 'Please try again.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex-1 p-6 overflow-hidden flex flex-col">
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">DATA MANAGEMENT</h1>
            <p className="text-muted-foreground">Add, view, and manage shipping records</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={filterItem} onValueChange={(v) => setFilterItem(v as FruitType | 'ALL')}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Items</SelectItem>
                <SelectItem value="BANANAS">Bananas</SelectItem>
                <SelectItem value="PINEAPPLES">Pineapples</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>

          {!isViewer && (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Record
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-heading">
                  {containerMode ? 'Add Container Records' : 'Add New Shipping Record'}
                </DialogTitle>
              </DialogHeader>
              
              {/* Validation Alert */}
              {validationMessage && (
                <Alert 
                  variant={validationMessage.type === 'error' ? 'destructive' : 'default'}
                  className={cn(
                    validationMessage.type === 'success' && 'border-green-500 bg-green-50 dark:bg-green-950',
                    validationMessage.type === 'warning' && 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950'
                  )}
                >
                  {validationMessage.type === 'error' && <AlertCircle className="h-4 w-4" />}
                  {validationMessage.type === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                  {validationMessage.type === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-600" />}
                  <AlertDescription className={cn(
                    validationMessage.type === 'success' && 'text-green-800 dark:text-green-200',
                    validationMessage.type === 'warning' && 'text-yellow-800 dark:text-yellow-200'
                  )}>
                    {validationMessage.message}
                  </AlertDescription>
                </Alert>
              )}

              {/* Container Info Section - Editable when not in container mode or when unlocked in container mode */}
              {(!containerMode || (containerMode && !containerInfoLocked)) && (
                <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Select 
                    value={newRecord.year.toString()} 
                    onValueChange={(v) => setNewRecord({ ...newRecord, year: parseInt(v) })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => {
                        const year = new Date().getFullYear() - 2 + i;
                        return (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Week</Label>
                  <Select 
                    value={newRecord.week.toString()} 
                    onValueChange={(v) => setNewRecord({ ...newRecord, week: parseInt(v) })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 52 }, (_, i) => {
                        const week = i + 1;
                        return (
                          <SelectItem key={week} value={week.toString()}>Week {week}</SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ETD</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newRecord.etdDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newRecord.etdDate ? format(newRecord.etdDate, "MM/dd/yyyy") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newRecord.etdDate}
                        onSelect={(date) => setNewRecord({ ...newRecord, etdDate: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>POL</Label>
                  <Select value={newRecord.pol} onValueChange={(v) => setNewRecord({ ...newRecord, pol: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {pols.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Item</Label>
                  <Select 
                    value={newRecord.item} 
                    onValueChange={(v) => {
                      const newItem = v as FruitType;
                      setNewRecord({ 
                        ...newRecord, 
                        item: newItem, 
                        pack: '', // Reset pack when item changes
                        supplier: '' // Reset supplier when item changes
                      });
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BANANAS">Bananas</SelectItem>
                      <SelectItem value="PINEAPPLES">Pineapples</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Destination</Label>
                  <Select value={newRecord.destination} onValueChange={(v) => setNewRecord({ ...newRecord, destination: v })}>
                    <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
                    <SelectContent>
                      {destinations.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Supplier</Label>
                  <Select value={newRecord.supplier} onValueChange={(v) => setNewRecord({ ...newRecord, supplier: v })}>
                    <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>S.Line</Label>
                  <Select value={newRecord.sLine} onValueChange={(v) => setNewRecord({ ...newRecord, sLine: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {sLines.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Container</Label>
                  <Input
                    placeholder="XXXX1234567"
                    value={newRecord.container}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase();
                      let filteredValue = '';
                      
                      if (value.length <= 4) {
                        // First 4 characters: only letters (A-Z), no numbers
                        filteredValue = value.replace(/[^A-Z]/g, '');
                      } else {
                        // First 4: letters only (A-Z), rest: integers only (0-9)
                        const firstFour = value.substring(0, 4).replace(/[^A-Z]/g, '');
                        const rest = value.substring(4).replace(/[^0-9]/g, ''); // Only digits after first 4
                        filteredValue = firstFour + rest;
                      }
                      
                      setNewRecord({ ...newRecord, container: filteredValue });
                    }}
                    maxLength={20}
                  />
                  {newRecord.container.length > 0 && newRecord.container.length < 4 && (
                    <p className="text-xs text-muted-foreground">
                      First 4 characters must be letters only (A-Z). Remaining characters must be numbers (0-9).
                    </p>
                  )}
                  {newRecord.container.length >= 4 && (
                    <p className="text-xs text-muted-foreground">
                      Format: 4 letters + numbers (e.g., ABCD1234567)
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select 
                    value={newRecord.type} 
                    onValueChange={(v) => setNewRecord({ ...newRecord, type: v as 'CONTRACT' | 'SPOT' })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONTRACT">CONTRACT</SelectItem>
                      <SelectItem value="SPOT">SPOT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              )}


              {/* Container Mode: Show locked container info and pack entry form */}
              {containerMode && containerInfoLocked && (
                <>
                  {/* Container Info Summary - Read Only */}
                  <div className="bg-muted/50 rounded-lg p-4 border space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-sm">Container Information</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setContainerInfoLocked(false);
                        }}
                        className="h-7 text-xs"
                      >
                        Change
                      </Button>
                    </div>
                    <div className="grid grid-cols-4 gap-3 text-sm">
                      <div>
                        <Label className="text-xs text-muted-foreground">Year</Label>
                        <div className="font-medium">{newRecord.year}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Week</Label>
                        <div className="font-medium">{newRecord.week}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">ETD</Label>
                        <div className="font-medium">{newRecord.etdDate ? format(newRecord.etdDate, 'MM/dd/yyyy') : '-'}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">POL</Label>
                        <div className="font-medium">{newRecord.pol}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Item</Label>
                        <div className="font-medium">{newRecord.item}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Destination</Label>
                        <div className="font-medium">{newRecord.destination}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Supplier</Label>
                        <div className="font-medium">{newRecord.supplier}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">S.Line</Label>
                        <div className="font-medium">{newRecord.sLine}</div>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs text-muted-foreground">Container</Label>
                        <div className="font-mono font-medium">{newRecord.container}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Type</Label>
                        <div className="font-medium">{newRecord.type}</div>
                      </div>
                    </div>
                  </div>

                  {/* Total Cartons Input */}
                  <div className="space-y-2">
                    <Label>Total Cartons in Container *</Label>
                    <Input
                      type="number"
                      placeholder="Enter total cartons"
                      value={containerTotalCartons}
                      onChange={(e) => {
                        const value = e.target.value === '' ? '' : parseInt(e.target.value);
                        setContainerTotalCartons(value);
                      }}
                      className="font-semibold text-lg"
                    />
                    <p className="text-xs text-muted-foreground">
                      This is the total capacity of the container. All pack entries must sum to this value.
                    </p>
                  </div>
                </>
              )}

              {/* Container Mode: Pack Entries Section - Only show after locking container info */}
              {containerMode && containerInfoLocked && (
                <div className="space-y-4 border-t pt-4 mt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Add Pack Entries</h3>
                    <div className="text-sm text-muted-foreground">
                      {existingRecordsForContainer.length > 0 && (
                        <span className="text-yellow-600 dark:text-yellow-400 mr-2">
                          Existing: {existingCartonsTotal.toLocaleString()} + 
                        </span>
                      )}
                      New: <span className="font-semibold text-foreground">{totalPackCartons.toLocaleString()}</span> / 
                      <span className="font-semibold text-foreground"> {containerTotalCartons ? containerTotalCartons.toLocaleString() : '0'}</span> cartons
                      {existingRecordsForContainer.length > 0 && (
                        <span className="ml-2">
                          (Total: <span className="font-semibold">{totalCartonsIncludingExisting.toLocaleString()}</span>)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Add Pack Entry Form - Pack and Cartons together */}
                  <div className="grid grid-cols-3 gap-3 p-4 bg-muted/30 rounded-lg border">
                    <div className="space-y-2 col-span-2">
                      <Label className="text-sm font-medium">Pack & Cartons</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Select 
                          value={currentPackEntry.pack} 
                          onValueChange={(v) => setCurrentPackEntry({ ...currentPackEntry, pack: v })}
                        >
                          <SelectTrigger className="h-10"><SelectValue placeholder="Select pack" /></SelectTrigger>
                          <SelectContent>
                            {packs.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          className="h-10"
                          placeholder="Cartons"
                          value={currentPackEntry.cartons || ''}
                          onChange={(e) => setCurrentPackEntry({ ...currentPackEntry, cartons: parseInt(e.target.value) || 0 })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && currentPackEntry.pack && currentPackEntry.cartons > 0) {
                              e.preventDefault();
                              handleAddPackEntry();
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Price ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        className="h-10"
                        value={currentPackEntry.price}
                        onChange={(e) => setCurrentPackEntry({ ...currentPackEntry, price: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="col-span-3 flex items-end">
                      <Button 
                        onClick={handleAddPackEntry}
                        className="w-full h-10"
                        disabled={!currentPackEntry.pack || !currentPackEntry.cartons || currentPackEntry.cartons <= 0 || !containerTotalCartons}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Pack Entry
                      </Button>
                    </div>
                  </div>

                  {/* Pack Entries List */}
                  {packEntries.length > 0 && (
                    <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                      <div className="grid grid-cols-5 gap-2 text-xs font-semibold text-muted-foreground pb-2 border-b">
                        <div>Pack</div>
                        <div className="text-right">Cartons</div>
                        <div className="text-right">L.Count</div>
                        <div className="text-right">Price</div>
                        <div></div>
                      </div>
                      {packEntries.map((entry, index) => {
                        const loadCount = calculateLoadCount(entry.cartons);
                        return (
                          <div key={index} className="grid grid-cols-5 gap-2 items-center py-2 border-b last:border-0">
                            <div className="font-medium">{entry.pack}</div>
                            <div className="text-right">{entry.cartons.toLocaleString()}</div>
                            <div className="text-right text-xs text-muted-foreground">{loadCount.toFixed(8)}</div>
                            <div className="text-right">${entry.price.toFixed(2)}</div>
                            <div className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemovePackEntry(index)}
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                {/* Show Cancel and Lock button when container mode is active but not locked */}
                {containerMode && !containerInfoLocked ? (
                  <>
                    <Button variant="outline" onClick={() => {
                      setIsOpen(false);
                      setContainerMode(false);
                      setContainerInfoLocked(false);
                      setContainerTotalCartons('');
                      setPackEntries([]);
                    }}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleLockContainerInfo}
                      disabled={!isContainerModeReady}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Lock Container Info
                    </Button>
                  </>
                ) : containerMode && containerInfoLocked ? (
                  <>
                    <Button variant="outline" onClick={() => {
                      setIsOpen(false);
                      setContainerMode(false);
                      setContainerInfoLocked(false);
                      setContainerTotalCartons('');
                      setPackEntries([]);
                    }}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSubmit}
                      disabled={packEntries.length === 0 || totalCartonsIncludingExisting !== containerTotalCartons}
                    >
                      Add {packEntries.length} Record(s)
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => {
                      setIsOpen(false);
                      setContainerMode(false);
                      setContainerInfoLocked(false);
                      setContainerTotalCartons('');
                      setPackEntries([]);
                    }}>
                      Cancel
                    </Button>
                    <Button onClick={handleSubmit}>
                      Add Record
                    </Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
          )}
          </div>
        </div>

        {/* Search Bar with Dropdowns */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {/* Year Dropdown */}
            <Select value={selectedYear || undefined} onValueChange={(value) => { setSelectedYear(value === 'all' ? '' : value); setCurrentPage(1); }}>
              <SelectTrigger className="w-[140px] h-10">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {uniqueYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Week Dropdown */}
            <Select value={selectedWeek || undefined} onValueChange={(value) => { setSelectedWeek(value === 'all' ? '' : value); setCurrentPage(1); }}>
              <SelectTrigger className="w-[140px] h-10">
                <SelectValue placeholder="Week" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Weeks</SelectItem>
                {uniqueWeeks.map(week => (
                  <SelectItem key={week} value={week.toString()}>{week}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Supplier Dropdown */}
            <Select value={selectedSupplier || undefined} onValueChange={(value) => { setSelectedSupplier(value === 'all' ? '' : value); setCurrentPage(1); }}>
              <SelectTrigger className="w-[200px] h-10">
                <SelectValue placeholder="Supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {uniqueSuppliers.map(supplier => (
                  <SelectItem key={supplier} value={supplier}>{supplier}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search Input */}
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Search by container, pack, S.Line, POL, destination, or cartons..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 pr-10"
                autoComplete="off"
              />
              {(searchQuery || selectedYear || selectedWeek || selectedSupplier) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSearch}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            {(searchQuery || selectedYear || selectedWeek || selectedSupplier) ? (
              <span>
                Found <span className="font-semibold text-foreground">{searchedData.length}</span> of{' '}
                <span className="font-semibold text-foreground">{itemFilteredData.length}</span> records
              </span>
            ) : (
              <span>
                Showing <span className="font-semibold text-foreground">{itemFilteredData.length}</span> total records
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="items-per-page" className="text-xs">Rows per page:</Label>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(v) => {
                setItemsPerPage(parseInt(v));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex-1 border border-border rounded-lg overflow-hidden bg-card">
        <div className="h-full overflow-auto">
          <Table className="min-w-[1200px]">
              <TableHeader className="sticky top-0 bg-primary text-primary-foreground">
              <TableRow>
                <TableHead className="text-primary-foreground">Year</TableHead>
                <TableHead className="text-primary-foreground">Week</TableHead>
                <TableHead className="text-primary-foreground">ETD</TableHead>
                <TableHead className="text-primary-foreground">POL</TableHead>
                <TableHead className="text-primary-foreground">Item</TableHead>
                <TableHead className="text-primary-foreground">Destination</TableHead>
                <TableHead className="text-primary-foreground">Supplier</TableHead>
                <TableHead className="text-primary-foreground">S.Line</TableHead>
                <TableHead className="text-primary-foreground">Container</TableHead>
                <TableHead className="text-primary-foreground">Pack</TableHead>
                <TableHead className="text-primary-foreground">L.Cont</TableHead>
                <TableHead className="text-primary-foreground">Cartons</TableHead>
                <TableHead className="text-primary-foreground">Type</TableHead>
                {!isViewer && (
                  <TableHead className="text-primary-foreground w-16 text-center">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isViewer ? 13 : 14} className="text-center py-8 text-muted-foreground">
                    {(searchQuery || selectedYear || selectedWeek || selectedSupplier) 
                      ? 'No records found matching your filters.' 
                      : !data || data.length === 0
                        ? 'No records available in the database.' 
                        : 'No records available.'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((record) => (
                <TableRow key={record.id} className="hover:bg-muted/50">
                  <TableCell>{record.year}</TableCell>
                  <TableCell>{record.week}</TableCell>
                  <TableCell>{record.etd}</TableCell>
                  <TableCell>{record.pol}</TableCell>
                  <TableCell className={record.item === 'BANANAS' ? 'text-gold font-medium' : 'text-accent font-medium'}>
                    {record.item}
                  </TableCell>
                  <TableCell>{record.destination}</TableCell>
                  <TableCell>{record.supplier}</TableCell>
                  <TableCell>{record.sLine}</TableCell>
                  <TableCell className="font-mono text-xs">{record.container}</TableCell>
                  <TableCell>{record.pack}</TableCell>
                  <TableCell>{record.lCont}</TableCell>
                  <TableCell className="font-semibold">{record.cartons.toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={cn(
                        "px-2 py-1 rounded text-xs font-medium",
                        record.type === 'CONTRACT'
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" 
                          : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                      )}>
                        {record.type}
                      </span>
                    </TableCell>
                  {!isViewer && (
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setRecordToDelete(record);
                          setDeleteDialogOpen(true);
                          setPassword('');
                          setPasswordError('');
                        }}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Delete record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, searchedData.length)} of {searchedData.length} records
          </p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage(prev => Math.max(1, prev - 1));
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
                    setCurrentPage(prev => Math.min(totalPages, prev + 1));
                  }}
                  className={cn(currentPage === totalPages && 'pointer-events-none opacity-50')}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Delete Confirmation Modal with Password */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
        if (!open && !isVerifying) {
          setDeleteDialogOpen(false);
          setPassword('');
          setPasswordError('');
          setRecordToDelete(null);
        }
      }}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <Lock className="h-5 w-5 text-destructive" />
              </div>
              <AlertDialogTitle className="text-xl">
                Delete Record?
            </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base pt-2">
              This action <span className="font-semibold text-foreground">cannot be undone</span>. 
              The record will be permanently removed from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Record Info Preview */}
            {recordToDelete && (
              <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Record to Delete
                  </p>
                  <span className="px-2 py-1 text-xs font-semibold rounded-md bg-destructive/10 text-destructive">
                    {recordToDelete.item}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Year</p>
                    <p className="font-semibold text-foreground">{recordToDelete.year}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Week</p>
                    <p className="font-semibold text-foreground">Week {recordToDelete.week}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">ETD</p>
                    <p className="font-semibold text-foreground">
                      {recordToDelete.etd ? format(new Date(recordToDelete.etd), 'MMM dd, yyyy') : 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">POL</p>
                    <p className="font-semibold text-foreground">{recordToDelete.pol || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Destination</p>
                    <p className="font-semibold text-foreground">{recordToDelete.destination || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">S.Line</p>
                    <p className="font-semibold text-foreground">{recordToDelete.sLine || 'N/A'}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-border space-y-2">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">Supplier</p>
                      <p className="font-semibold text-foreground">{recordToDelete.supplier || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">Pack</p>
                      <p className="font-semibold text-foreground">{recordToDelete.pack || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">Container</p>
                      <p className="font-semibold text-foreground font-mono text-xs">
                        {recordToDelete.container || 'N/A'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">Cartons</p>
                      <p className="font-semibold text-foreground">
                        {recordToDelete.cartons?.toLocaleString() || '0'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">L.Cont</p>
                      <p className="font-semibold text-foreground">
                        {recordToDelete.lCont?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>
                  {recordToDelete.price && (
                    <div className="space-y-1 text-sm">
                      <p className="text-xs text-muted-foreground font-medium">Price</p>
                      <p className="font-semibold text-foreground">
                        ${recordToDelete.price.toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Password Input */}
            <div className="space-y-2">
              <Label htmlFor="delete-password" className="text-sm font-semibold">
                Confirm with Password
              </Label>
              <Input
                id="delete-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && password && !isVerifying) {
                    handleConfirmDelete();
                  }
                }}
                className={cn(
                  "h-11 transition-all",
                  passwordError && 'border-destructive focus-visible:ring-destructive'
                )}
                autoFocus
                disabled={isVerifying}
              />
              {passwordError && (
                <div className="flex items-center gap-2 text-sm text-destructive animate-in fade-in-0">
                  <span>⚠️</span>
                  <span>{passwordError}</span>
                </div>
              )}
            </div>
          </div>

          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel 
              onClick={() => {
                if (!isVerifying) {
                setDeleteDialogOpen(false);
                setPassword('');
                setPasswordError('');
                setRecordToDelete(null);
                }
              }}
              disabled={isVerifying}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto order-1 sm:order-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!password || isVerifying}
            >
              {isVerifying ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Verifying...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete Record
                </span>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate Record Warning Dialog */}
      <AlertDialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Package className="h-5 w-5" />
              Duplicate Record Detected
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              A record with the same <strong>Container Number</strong> and <strong>ETD</strong> already exists in the database.
              <br />
              <span className="text-sm text-muted-foreground mt-1 block">
                Each Container number and ETD combination must be unique in the database.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold">Existing Record Details:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Container:</span>{' '}
                  <span className="font-medium">{duplicateRecords[0]?.container}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">ETD:</span>{' '}
                  <span className="font-medium">{duplicateRecords[0]?.etd}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">POL:</span>{' '}
                  <span className="font-medium">{duplicateRecords[0]?.pol}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Pack:</span>{' '}
                  <span className="font-medium">{duplicateRecords[0]?.pack}</span>
                </div>
              </div>
            </div>

            {duplicateRecords.length > 1 && (
              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ Found <strong>{duplicateRecords.length}</strong> existing record(s) with the same Container and ETD combination.
                </p>
              </div>
            )}

            <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
              <AlertDescription className="text-sm text-orange-800 dark:text-orange-200">
                Please verify the container number and ETD date before adding a new record. Each Container number and ETD combination must be unique. If you need to add multiple packs to the same container, use Container Mode.
              </AlertDescription>
            </Alert>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setDuplicateDialogOpen(false);
                setDuplicateRecords([]);
                setPendingLock(false);
                setIsAddingRecord(false);
              }}
            >
              {isAddingRecord ? 'Cancel' : 'Cancel'}
            </AlertDialogCancel>
            {isAddingRecord ? (
              // If adding a record, only allow closing - cannot proceed with duplicate
              <AlertDialogAction
                onClick={() => {
                  setDuplicateDialogOpen(false);
                  setDuplicateRecords([]);
                  setIsAddingRecord(false);
                }}
                className="bg-destructive hover:bg-destructive/90"
              >
                Close
              </AlertDialogAction>
            ) : (
              // If locking container, allow proceeding with warning
              <AlertDialogAction
                onClick={() => {
                  setDuplicateDialogOpen(false);
                  setDuplicateRecords([]);
                  
                  // If this was triggered from lock button, lock the container now
                  if (pendingLock) {
                    setContainerInfoLocked(true);
                    setPendingLock(false);
                    toast.warning('Container locked. Please verify details - duplicate records detected.');
                  }
                  setIsAddingRecord(false);
                }}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {pendingLock ? 'I Understand - Lock Anyway' : 'I Understand'}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
