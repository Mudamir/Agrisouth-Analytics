import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShippingRecord, FruitType, FilterState, PackStats } from '@/types/shipping';
import { supabase, DatabaseShippingRecord } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { normalizeInvoiceNumber, validateInvoiceNumber } from '@/lib/invoiceNumber';

// Helper to transform database record to app record
function transformRecord(dbRecord: DatabaseShippingRecord): ShippingRecord {
  return {
    id: dbRecord.id,
    year: dbRecord.year,
    week: dbRecord.week,
    etd: dbRecord.etd,
    eta: dbRecord.eta || null,
    pol: dbRecord.pol,
    item: dbRecord.item,
    destination: dbRecord.destination,
    supplier: dbRecord.supplier,
    sLine: dbRecord.s_line,
    container: dbRecord.container,
    pack: dbRecord.pack,
    lCont: Number(dbRecord.l_cont),
    cartons: dbRecord.cartons,
    type: dbRecord.type || 'SPOT',
    customerName: dbRecord.customer_name || null,
    invoiceNo: dbRecord.invoice_no || null,
    invoiceDate: dbRecord.invoice_date || null,
    vessel: dbRecord.vessel || null,
    billingNo: dbRecord.billing_no || null,
  };
}

const SHIPPING_RECORD_COLUMNS =
  'id,year,week,etd,eta,pol,item,destination,supplier,s_line,container,pack,l_cont,cartons,type,customer_name,invoice_no,invoice_date,vessel,billing_no';

const SHIPPING_BATCH_SIZE = 1000;

async function fetchAllShippingRecordsFromSupabase(): Promise<ShippingRecord[]> {
  if (!supabase) {
    return [];
  }

  const { count, error: countError } = await supabase
    .from('shipping_records')
    .select('id', { count: 'exact', head: true });

  if (countError) {
    throw countError;
  }

  const total = count ?? 0;
  if (total === 0) {
    return [];
  }

  const batchCount = Math.ceil(total / SHIPPING_BATCH_SIZE);
  const batchRequests = Array.from({ length: batchCount }, (_, index) => {
    const from = index * SHIPPING_BATCH_SIZE;
    const to = from + SHIPPING_BATCH_SIZE - 1;

    return supabase
      .from('shipping_records')
      .select(SHIPPING_RECORD_COLUMNS)
      .order('year', { ascending: false })
      .order('week', { ascending: false })
      .range(from, to);
  });

  const batchResults = await Promise.all(batchRequests);
  const allRecords: DatabaseShippingRecord[] = [];

  for (const { data, error } of batchResults) {
    if (error) {
      throw error;
    }
    if (data?.length) {
      allRecords.push(...(data as DatabaseShippingRecord[]));
    }
  }

  return allRecords.map(transformRecord);
}

function upsertShippingRecordCache(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (records: ShippingRecord[]) => ShippingRecord[]
) {
  queryClient.setQueryData<ShippingRecord[]>(['shipping-records'], (current) =>
    updater(current ?? [])
  );
}

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
  const { user, isAdmin, loading: authLoading } = useAuth();

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
  const { data: allData = [], isLoading, error, isFetching } = useQuery({
    queryKey: ['shipping-records'],
    queryFn: async () => {
      logger.debug('Fetching shipping records...', { user: user?.id, supabase: !!supabase });

      try {
        const records = await fetchAllShippingRecordsFromSupabase();
        logger.info(`Successfully fetched ${records.length} records from Supabase`);
        return records;
      } catch (err) {
        logger.safeError('Failed to fetch shipping records', err);
        return [];
      }
    },
    enabled: !!supabase && !authLoading,
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000),
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
    
    // 13kg packs (13.5 KG A, 13.5 KG B, 13.5 KG A/B SH): cartons / 1540
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
  // For Bananas: 13.5 KG A (4/5/6), 13.5 KG B (4/5/6), 13.5 KG A SH (7/8/9), 13.5 KG B SH (7/8/9), 7KG, 3KG, 18KG
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
    // 1. 13.5 KG A (4/5/6) — also matches legacy "13.5 KG A"
    if (packUpper === '13.5 KG A (4/5/6)' || packUpper === '13.5 KG A' || (packUpper.includes('13.5') && packUpper.includes('A') && !packUpper.includes('B') && !packUpper.includes('SH'))) {
      return 1;
    }
    // 2. 13.5 KG B (4/5/6) — also matches legacy "13.5 KG B"
    if (packUpper === '13.5 KG B (4/5/6)' || packUpper === '13.5 KG B' || (packUpper.includes('13.5') && packUpper.includes('B') && !packUpper.includes('SH') && !packUpper.includes('S/H'))) {
      return 2;
    }
    // 3. 13.5 KG A SH (7/8/9) — also matches legacy "13.5 KG SH"
    if (packUpper === '13.5 KG A SH (7/8/9)' || packUpper === '13.5 KG SH' ||
        (packUpper.includes('13.5') && (packUpper.includes('SH') || packUpper.includes('S/H')) && packUpper.includes('A') && !packUpper.includes('B')) ||
        (packUpper.includes('13.5') && (packUpper.includes('SH') || packUpper.includes('S/H')) && !packUpper.includes('A') && !packUpper.includes('B'))) {
      return 3;
    }
    // 4. 13.5 KG B SH (7/8/9)
    if (packUpper === '13.5 KG B SH (7/8/9)' ||
        (packUpper.includes('13.5') && (packUpper.includes('SH') || packUpper.includes('S/H')) && packUpper.includes('B'))) {
      return 3.5;
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

      // Helper to convert empty strings to null
      const toNullIfEmpty = (value: string | null | undefined): string | null => {
        if (value === null || value === undefined) return null;
        if (typeof value === 'string' && value.trim() === '') return null;
        return value;
      };

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
          type: record.type,
          eta: toNullIfEmpty(record.eta),
          vessel: toNullIfEmpty(record.vessel),
          invoice_no: toNullIfEmpty(record.invoiceNo),
          invoice_date: toNullIfEmpty(record.invoiceDate),
          customer_name: toNullIfEmpty(record.customerName),
          billing_no: toNullIfEmpty(record.billingNo),
        })
        .select()
        .single();

      if (error) {
        logger.safeError('Database insert error', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          data: {
            year: record.year,
            week: record.week,
            etd: record.etd,
            pol: record.pol,
            item: record.item,
            destination: record.destination,
            supplier: record.supplier,
            s_line: record.sLine,
            container: record.container,
            pack: record.pack,
            l_cont: record.lCont,
            cartons: record.cartons,
            type: record.type,
            eta: record.eta,
            vessel: record.vessel,
            invoice_no: record.invoiceNo,
            invoice_date: record.invoiceDate,
            customer_name: record.customerName,
            billing_no: record.billingNo,
          }
        });
        throw error;
      }

      // Manually log activity to data_activity_log
      // This ensures every record addition is tracked
      if (data) {
        try {
          // Get current user ID
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          if (userError) {
            logger.safeError('Failed to get user for activity log', userError);
          } else if (user?.id) {
            // Insert activity log with all record details
            const { error: logError } = await supabase
              .from('data_activity_log')
              .insert({
                action: 'INSERT',
                record_id: data.id,
                user_id: user.id,
                action_timestamp: new Date().toISOString(),
                // Denormalized fields for quick access
                pack: data.pack || null,
                container: data.container || null,
                cartons: data.cartons || 0,
                etd: data.etd || null,
                item: data.item || null,
                supplier: data.supplier || null,
                year: data.year || null,
                week: data.week || null,
                type: data.type || null,
                // Store full snapshot in JSONB for complete record history
                snapshot_data: {
                  year: data.year,
                  week: data.week,
                  etd: data.etd,
                  eta: data.eta,
                  pol: data.pol,
                  item: data.item,
                  destination: data.destination,
                  supplier: data.supplier,
                  s_line: data.s_line,
                  container: data.container,
                  pack: data.pack,
                  l_cont: data.l_cont,
                  cartons: data.cartons,
                  type: data.type,
                  customer_name: data.customer_name,
                  invoice_no: data.invoice_no,
                  invoice_date: data.invoice_date,
                  vessel: data.vessel,
                  billing_no: data.billing_no,
                },
              });

            if (logError) {
              // Log error but don't fail the main operation
              logger.safeError('Failed to log activity to data_activity_log', {
                error: logError,
                recordId: data.id,
                userId: user.id,
              });
              console.error('Activity log error:', logError);
            } else {
              logger.debug('Activity logged successfully', { recordId: data.id, userId: user.id });
            }
          } else {
            logger.safeError('No user ID available for activity logging', { recordId: data.id });
          }
        } catch (logErr: any) {
          // Catch any unexpected errors in logging process
          logger.safeError('Unexpected error during activity logging', logErr);
          // Don't throw - the main record insert was successful
        }
      }

      return transformRecord(data);
    },
    onSuccess: (newRecord) => {
      upsertShippingRecordCache(queryClient, (records) => [newRecord, ...records]);
    },
    onError: (error: any) => {
      // Handle database errors (including unique constraint violations if database has them)
      logger.safeError('Error adding record', error);
      
      // Log full error details for debugging
      console.error('Full error object:', error);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      
      // Check if it's a unique constraint violation from database
      if (error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
        toast.error('A record with this Container and ETD combination already exists in the database.');
      } else if (error.message) {
        // Show the actual error message to help debug
        toast.error(`Failed to add record: ${error.message}`);
      } else {
        toast.error('Failed to add record. Please check the console for details.');
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

      // First, fetch the complete record details before deleting (for audit log)
      const { data: recordToDelete, error: fetchError } = await supabase
        .from('shipping_records')
        .select('*')
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

      // Get current user ID for logging
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      const userId = user?.id || null;

      if (userError) {
        logger.safeError('Failed to get user for activity log', userError);
      }

      // Manually log activity to data_activity_log before deletion
      // This ensures every record deletion is tracked
      if (userId && recordToDelete) {
        try {
          const { error: logError } = await supabase
            .from('data_activity_log')
            .insert({
              action: 'DELETE',
              record_id: recordToDelete.id,
              user_id: userId,
              action_timestamp: new Date().toISOString(),
              // Denormalized fields for quick access
              pack: recordToDelete.pack || null,
              container: recordToDelete.container || null,
              cartons: recordToDelete.cartons || 0,
              etd: recordToDelete.etd || null,
              item: recordToDelete.item || null,
              supplier: recordToDelete.supplier || null,
              year: recordToDelete.year || null,
              week: recordToDelete.week || null,
              type: recordToDelete.type || null,
              // Store complete snapshot in JSONB for full record history
              snapshot_data: {
                id: recordToDelete.id,
                year: recordToDelete.year,
                week: recordToDelete.week,
                etd: recordToDelete.etd,
                eta: recordToDelete.eta,
                pol: recordToDelete.pol,
                item: recordToDelete.item,
                destination: recordToDelete.destination,
                supplier: recordToDelete.supplier,
                s_line: recordToDelete.s_line,
                container: recordToDelete.container,
                pack: recordToDelete.pack,
                l_cont: recordToDelete.l_cont,
                cartons: recordToDelete.cartons,
                type: recordToDelete.type,
                customer_name: recordToDelete.customer_name,
                invoice_no: recordToDelete.invoice_no,
                invoice_date: recordToDelete.invoice_date,
                vessel: recordToDelete.vessel,
                billing_no: recordToDelete.billing_no,
              },
            });

          if (logError) {
            // Log error but don't fail the main operation
            logger.safeError('Failed to log deletion activity to data_activity_log', logError);
          } else {
            logger.info('Successfully logged deletion activity for record:', recordToDelete.id);
          }
        } catch (logError: any) {
          // Log error but don't fail the main operation
          logger.safeError('Exception while logging deletion activity', logError);
        }
      } else if (!userId) {
        logger.warn('Cannot log deletion activity: No user ID available');
      }

      // Delete the record
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
      upsertShippingRecordCache(queryClient, (records) =>
        records.filter((record) => record.id !== result.id)
      );
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

  const updateInvoiceNumberMutation = useMutation({
    mutationFn: async ({
      id,
      invoiceNo,
      item,
      year,
    }: {
      id: string;
      invoiceNo: string | null;
      item: FruitType;
      year: number;
    }) => {
      if (!supabase) {
        throw new Error('Supabase not configured');
      }

      if (!isAdmin) {
        throw new Error('Only administrators can edit invoice numbers');
      }

      const normalizedInvoiceNo = normalizeInvoiceNumber(invoiceNo);

      if (normalizedInvoiceNo) {
        const validation = validateInvoiceNumber(normalizedInvoiceNo, item, year);
        if (!validation.valid) {
          throw new Error(validation.message || 'Invalid invoice number format');
        }
      }

      const { data, error } = await supabase
        .from('shipping_records')
        .update({ invoice_no: normalizedInvoiceNo })
        .eq('id', id)
        .select('*');

      if (error) {
        logger.safeError('Error updating invoice number', error);
        throw new Error(error.message || 'Failed to update invoice number');
      }

      if (!data || data.length === 0) {
        throw new Error('Unable to update invoice number. Please sign in again or contact an administrator.');
      }

      return transformRecord(data[0] as DatabaseShippingRecord);
    },
    onSuccess: (updatedRecord) => {
      upsertShippingRecordCache(queryClient, (records) =>
        records.map((record) => (record.id === updatedRecord.id ? updatedRecord : record))
      );
    },
    onError: (error: Error) => {
      logger.safeError('Update invoice number mutation error', error);
    },
  });

  const updateInvoiceNumber = async (
    id: string,
    invoiceNo: string | null,
    item: FruitType,
    year: number
  ) => {
    return updateInvoiceNumberMutation.mutateAsync({ id, invoiceNo, item, year });
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
    updateInvoiceNumber,
    isLoading: isLoading || authLoading,
    isFetching,
    error,
  };
}


