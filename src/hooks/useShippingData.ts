import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShippingRecord, FruitType, FilterState, PackStats } from '@/types/shipping';
import { supabase, DatabaseShippingRecord } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

// Helper to transform database record to app record
function transformRecord(dbRecord: DatabaseShippingRecord): ShippingRecord {
  return {
    id: dbRecord.id,
    year: dbRecord.year,
    week: dbRecord.week,
    etd: dbRecord.etd,
    pol: dbRecord.pol,
    item: dbRecord.item,
    destination: dbRecord.destination,
    supplier: dbRecord.supplier,
    sLine: dbRecord.s_line,
    container: dbRecord.container,
    pack: dbRecord.pack,
    lCont: Number(dbRecord.l_cont),
    cartons: dbRecord.cartons,
    price: Number(dbRecord.price),
    type: dbRecord.type || 'SPOT',
  };
}

// Helper functions for unique values
function getUniqueYears(data: ShippingRecord[]): number[] {
  return [...new Set(data.map(r => r.year))].sort((a, b) => b - a);
}

function getUniqueWeeks(data: ShippingRecord[]): number[] {
  return [...new Set(data.map(r => r.week))].sort((a, b) => a - b);
}

function getUniqueSuppliers(data: ShippingRecord[]): string[] {
  return [...new Set(data.map(r => r.supplier))].sort();
}

function getUniqueSLines(data: ShippingRecord[]): string[] {
  return [...new Set(data.map(r => r.sLine))].sort();
}

function getUniquePols(data: ShippingRecord[]): string[] {
  return [...new Set(data.map(r => r.pol))].sort();
}

function getUniqueDestinations(data: ShippingRecord[]): string[] {
  return [...new Set(data.map(r => r.destination))].sort();
}

export function useShippingData() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [selectedFruit, setSelectedFruit] = useState<FruitType>('BANANAS');
  const [filters, setFilters] = useState<FilterState>({
    year: null, // Default to null to show all years
    weeks: [],
    suppliers: [],
    sLines: [],
    pols: [],
    destinations: [],
  });

  // Fetch all shipping records from Supabase
  const { data: allData = [], isLoading, error } = useQuery({
    queryKey: ['shipping-records'],
    queryFn: async () => {
      logger.debug('Fetching shipping records...', { user: user?.id, supabase: !!supabase });
      
      if (!supabase) {
        logger.warn('Supabase not configured. Using empty data.');
        return [];
      }

      try {
        // Fetch ALL records from the database using batching
        // This ensures we get all data regardless of dataset size
        let allRecords: DatabaseShippingRecord[] = [];
        let from = 0;
        const batchSize = 1000; // Supabase default limit is 1000, so we'll batch in chunks
        let hasMore = true;
        let consecutiveErrors = 0;
        const maxErrors = 3;

        logger.debug('Starting to fetch all shipping records...');

        while (hasMore && consecutiveErrors < maxErrors) {
          const { data: batch, error: batchError } = await supabase
            .from('shipping_records')
            .select('*')
            .order('year', { ascending: false })
            .order('week', { ascending: false })
            .range(from, from + batchSize - 1);

          if (batchError) {
            logger.safeError(`Error fetching batch ${from}-${from + batchSize - 1}`, batchError);
            consecutiveErrors++;
            
            // Check if it's a permission error
            if (batchError.code === '42501' || batchError.message?.includes('permission denied') || batchError.message?.includes('policy')) {
              logger.error('Permission denied. Check RLS policies and user permissions.');
              // Return what we have so far instead of throwing
              break;
            }
            
            // If too many consecutive errors, break and return what we have
            if (consecutiveErrors >= maxErrors) {
              logger.warn(`Too many consecutive errors (${consecutiveErrors}), stopping batch fetch. Returning ${allRecords.length} records fetched so far.`);
              break;
            }
            
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Continue to next batch
            from += batchSize;
            continue;
          }

          consecutiveErrors = 0; // Reset error counter on success

          if (batch && batch.length > 0) {
            allRecords = [...allRecords, ...batch];
            logger.debug(`Fetched batch: ${batch.length} records (total: ${allRecords.length})`);
            from += batchSize;
            hasMore = batch.length === batchSize; // Continue if we got a full batch
          } else {
            // No more data
            hasMore = false;
            logger.debug('No more records to fetch');
          }
        }

        logger.info(`Successfully fetched ${allRecords.length} records from Supabase`);
        return allRecords.map(transformRecord);
      } catch (err) {
        logger.safeError('Failed to fetch shipping records', err);
        // Return empty array instead of throwing to prevent UI crash
        return [];
      }
    },
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes (longer cache = faster)
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
    // Enable background refetching for fresh data
    refetchOnWindowFocus: false, // Don't refetch on window focus (faster)
    refetchOnMount: true, // Always refetch on mount to ensure we get all data
    refetchOnReconnect: true, // Refetch when connection is restored
    retry: 3, // Retry failed requests up to 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  const fruitData = useMemo(() => {
    return allData.filter(r => r.item === selectedFruit);
  }, [allData, selectedFruit]);

  const filteredData = useMemo(() => {
    return fruitData.filter(record => {
      if (filters.year && record.year !== filters.year) return false;
      if (filters.weeks.length > 0 && !filters.weeks.includes(record.week)) return false;
      if (filters.suppliers.length > 0 && !filters.suppliers.includes(record.supplier)) return false;
      if (filters.sLines.length > 0 && !filters.sLines.includes(record.sLine)) return false;
      if (filters.pols.length > 0 && !filters.pols.includes(record.pol)) return false;
      if (filters.destinations.length > 0 && !filters.destinations.includes(record.destination)) return false;
      return true;
    });
  }, [fruitData, filters]);

  const years = useMemo(() => getUniqueYears(allData), [allData]);
  // Use allData for weeks so all weeks are available regardless of selected fruit
  const weeks = useMemo(() => getUniqueWeeks(allData), [allData]);
  const suppliers = useMemo(() => getUniqueSuppliers(fruitData), [fruitData]);
  const sLines = useMemo(() => getUniqueSLines(fruitData), [fruitData]);
  const pols = useMemo(() => getUniquePols(fruitData), [fruitData]);
  const destinations = useMemo(() => getUniqueDestinations(fruitData), [fruitData]);

  // Helper function to get carton-to-container divisor based on pack weight
  // Returns the number of cartons per container for a given pack
  const getCartonToContainerDivisor = (pack: string): number | null => {
    const packUpper = pack.toUpperCase().trim();
    
    // 13kg packs (13.5 KG A, 13.5 KG B, 13.5 KG SH): cartons / 1540
    if (packUpper.includes('13.5') || (packUpper.includes('13') && packUpper.includes('KG') && !packUpper.includes('3KG'))) {
      return 1540;
    }
    
    // 6kg and 7kg packs: cartons / 2470
    if (packUpper === '6KG' || packUpper === '7KG' || packUpper === '7.2 KG A' || 
        (packUpper.match(/^6\s*KG/i) || packUpper.match(/^7\s*KG/i) || packUpper.match(/^7\.2\s*KG/i)) && 
        !packUpper.includes('13.5') && !packUpper.includes('17') && !packUpper.includes('27')) {
      return 2470;
    }
    
    // 3kg packs: cartons / 6375
    if (packUpper === '3KG' || packUpper === '3 KG A' || 
        (packUpper.match(/^3\s*KG/i) && !packUpper.includes('13.5') && !packUpper.includes('13 KG'))) {
      return 6375;
    }
    
    // 18kg packs: cartons / 1080
    if (packUpper === '18KG' || packUpper === '18 KG A' || packUpper.includes('18 KG')) {
      return 1080;
    }
    
    // For other packs (like pineapples), return null to use existing lCont calculation
    return null;
  };

  // Custom sort order for pack stats (left to right)
  // For Pineapples: 7C, 8C, 9C, 10C, 11C, 12C (sorted numerically)
  // For Bananas: 13.5 KG A, 13.5 KG B, 13.5 KG SH, 7KG (or 7.2 KG A), 3KG (or 3 KG A), 18KG (or 18 KG A)
  const getPackSortOrder = (pack: string): number => {
    const packUpper = pack.toUpperCase().trim();
    
    // Check if it's a pineapple pack (pattern: number followed by 'C', e.g., 7C, 8C, 9C, 10C, 11C, 12C)
    const pineappleMatch = packUpper.match(/^(\d+)C$/);
    if (pineappleMatch) {
      const number = parseInt(pineappleMatch[1], 10);
      // Return the number directly so 7C=7, 8C=8, 9C=9, 10C=10, 11C=11, 12C=12
      // This ensures they sort in ascending order from 7C to 12C
      return number;
    }
    
    // Banana pack sorting (existing logic)
    // 1. 13.5 KG A (exact match or contains 13.5 and A, but not B or SH)
    if (packUpper === '13.5 KG A' || (packUpper.includes('13.5') && packUpper.includes('A') && !packUpper.includes('B') && !packUpper.includes('SH'))) {
      return 1;
    }
    // 2. 13.5 KG B
    if (packUpper === '13.5 KG B' || (packUpper.includes('13.5') && packUpper.includes('B'))) {
      return 2;
    }
    // 3. 13.5 KG SH
    if (packUpper === '13.5 KG SH' || (packUpper.includes('13.5') && (packUpper.includes('SH') || packUpper.includes('S/H')))) {
      return 3;
    }
    // 4. 7KG or 7.2 KG A (matches "7KG" exactly or starts with "7" and has KG, but not part of 13.5, 17, 27)
    if (packUpper === '7KG' || packUpper === '7.2 KG A' || 
        (packUpper.match(/^7\s*KG/i) || packUpper.match(/^7\.2\s*KG/i)) && !packUpper.includes('13.5') && !packUpper.includes('17') && !packUpper.includes('27')) {
      return 4;
    }
    // 4.5. 6KG (between 7KG and 3KG)
    if (packUpper === '6KG' || (packUpper.match(/^6\s*KG/i) && !packUpper.includes('13.5') && !packUpper.includes('16') && !packUpper.includes('26'))) {
      return 4.5;
    }
    // 5. 3KG or 3 KG A (matches "3KG" exactly or starts with "3" and has KG, but not part of 13.5)
    if (packUpper === '3KG' || packUpper === '3 KG A' || 
        (packUpper.match(/^3\s*KG/i) && !packUpper.includes('13.5'))) {
      return 5;
    }
    // 6. 18KG or 18 KG A
    if (packUpper === '18KG' || packUpper === '18 KG A' || packUpper.includes('18 KG')) {
      return 6;
    }
    // Any other packs go to the end
    return 999;
  };

  const packStats = useMemo((): PackStats[] => {
    const statsMap = new Map<string, { containers: number; cartons: number }>();
    
    filteredData.forEach(record => {
      const existing = statsMap.get(record.pack) || { containers: 0, cartons: 0 };
      
      // Calculate containers based on cartons and pack weight divisor
      const divisor = getCartonToContainerDivisor(record.pack);
      let containerValue = 0;
      
      if (divisor !== null) {
        // Use cartons / divisor for banana packs
        containerValue = record.cartons / divisor;
      } else {
        // For other packs (like pineapples), use existing lCont
        containerValue = record.lCont;
      }
      
      statsMap.set(record.pack, {
        containers: existing.containers + containerValue,
        cartons: existing.cartons + record.cartons,
      });
    });

    return Array.from(statsMap.entries())
      .map(([pack, stats]) => ({
      pack,
      containers: parseFloat(stats.containers.toFixed(2)),
      cartons: stats.cartons,
      }))
      .sort((a, b) => {
        // First sort by custom order
        const orderA = getPackSortOrder(a.pack);
        const orderB = getPackSortOrder(b.pack);
        
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        
        // If same order, sort by pack name alphabetically
        return a.pack.localeCompare(b.pack);
      });
  }, [filteredData]);

  const totalStats = useMemo(() => {
    return filteredData.reduce(
      (acc, record) => {
        // Use lCont (load count) directly from the data for total containers
        return {
          containers: acc.containers + record.lCont,
          cartons: acc.cartons + record.cartons,
        };
      },
      { containers: 0, cartons: 0 }
    );
  }, [filteredData]);

  const supplierStats = useMemo(() => {
    const statsMap = new Map<string, { containers: number; cartons: number }>();
    
    filteredData.forEach(record => {
      const existing = statsMap.get(record.supplier) || { containers: 0, cartons: 0 };
      
      // For supplier stats, use lCont (load count) directly from the data
      statsMap.set(record.supplier, {
        containers: existing.containers + record.lCont,
        cartons: existing.cartons + record.cartons,
      });
    });

    return Array.from(statsMap.entries()).map(([supplier, stats]) => ({
      supplier,
      containers: parseFloat(stats.containers.toFixed(2)),
      cartons: stats.cartons,
    })).sort((a, b) => a.supplier.localeCompare(b.supplier));
  }, [filteredData]);

  // Add record mutation
  const addMutation = useMutation({
    mutationFn: async (record: Omit<ShippingRecord, 'id'>) => {
      if (!supabase) {
        throw new Error('Supabase not configured');
      }

      // Note: Duplicate verification is handled at the UI level for container mode (when locking)
      // Regular add mode allows duplicates - no backend check needed
      // Database constraints will handle any actual unique constraint violations if needed

      // Insert into shipping_records
      const { data, error } = await supabase
        .from('shipping_records')
        .insert({
          year: record.year,
          week: record.week,
          etd: record.etd,
          pol: record.pol,
          item: record.item,
          destination: record.destination,
          supplier: record.supplier,
          s_line: record.sLine,
          container: record.container.trim().toUpperCase(),
          pack: record.pack,
          l_cont: record.lCont,
          cartons: record.cartons,
          price: record.price,
          type: record.type,
        })
        .select()
        .single();

      if (error) throw error;

      // Note: Logging is now handled automatically by database triggers
      // No need to manually insert into data_activity_log

      return transformRecord(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-records'] });
    },
    onError: (error: Error) => {
      // Handle database errors (including unique constraint violations if database has them)
      logger.safeError('Error adding record', error);
      
      // Check if it's a unique constraint violation from database
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        toast.error('A record with this Container and ETD combination already exists in the database.');
      } else {
        toast.error('Failed to add record. Please try again.');
      }
    },
  });

  // Delete record mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) {
        throw new Error('Database not configured');
      }

      logger.debug('Attempting to delete record:', id);

      // First, fetch the record details before deleting (for audit log)
      const { data: recordToDelete, error: fetchError } = await supabase
        .from('shipping_records')
        .select('id, pack, container, cartons, etd, supplier, item, year, week, type')
        .eq('id', id)
        .single();

      if (fetchError) {
        logger.safeError('Error fetching record to delete', fetchError);
        if (fetchError.code === 'PGRST116' || fetchError.message?.includes('not found')) {
          throw new Error('Record not found or already deleted');
        }
        throw new Error(fetchError.message || 'Failed to fetch record for deletion');
      }

      if (!recordToDelete) {
        throw new Error('Record not found');
      }

      // Note: Logging is now handled automatically by database triggers
      // The trigger will capture the record data before deletion
      // No need to manually insert into data_activity_log

      // Delete the record (trigger will log it automatically)
      const { error: deleteError, data } = await supabase
        .from('shipping_records')
        .delete()
        .eq('id', id)
        .select();

      if (deleteError) {
        logger.safeError('Error deleting record', {
          code: deleteError.code,
          message: deleteError.message,
          details: deleteError.details,
          hint: deleteError.hint,
        });
        
        // Check if it's a "not found" error
        if (deleteError.code === 'PGRST116' || deleteError.message?.includes('not found')) {
          throw new Error('Record not found or already deleted');
        }
        
        // Check for RLS policy errors
        if (deleteError.code === '42501' || deleteError.message?.includes('permission denied') || deleteError.message?.includes('policy')) {
          throw new Error('Permission denied. You may not have permission to delete records. Please check your user role.');
        }
        
        throw new Error(deleteError.message || 'Failed to delete record from database');
      }

      // data is an array from Supabase delete().select()
      const deletedRecord = data && data.length > 0 ? data[0] : null;
      if (deletedRecord) {
        logger.info('Delete successful. Deleted record:', deletedRecord.id);
      } else {
        logger.info('Delete successful. Deleted record:', id);
      }
      
      // If no error, deletion succeeded
      return { id, deleted: true };
    },
    onSuccess: (result) => {
      logger.debug('Delete mutation succeeded:', result);
      queryClient.invalidateQueries({ queryKey: ['shipping-records'] });
    },
    onError: (error: Error) => {
      logger.safeError('Delete mutation error', error);
    },
  });

  const addRecord = (record: Omit<ShippingRecord, 'id'>) => {
    addMutation.mutate(record);
  };

  const deleteRecord = async (id: string) => {
    return await deleteMutation.mutateAsync(id);
  };

  const updateFilter = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayFilter = (key: 'weeks' | 'suppliers' | 'sLines' | 'pols' | 'destinations', value: string | number) => {
    setFilters(prev => {
      const current = prev[key] as (string | number)[];
      const newValue = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [key]: newValue };
    });
  };

  const clearFilters = () => {
    setFilters({
      year: filters.year,
      weeks: [],
      suppliers: [],
      sLines: [],
      pols: [],
      destinations: [],
    });
  };

  return {
    data: allData,
    filteredData,
    selectedFruit,
    setSelectedFruit,
    filters,
    updateFilter,
    toggleArrayFilter,
    clearFilters,
    years,
    weeks,
    suppliers,
    sLines,
    pols,
    destinations,
    packStats,
    totalStats,
    supplierStats,
    addRecord,
    deleteRecord,
    isLoading,
    error,
  };
}
