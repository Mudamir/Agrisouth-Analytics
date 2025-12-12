import { useState, useMemo, useEffect } from 'react';
import { FruitType } from '@/types/shipping';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, DollarSign, ShoppingCart, Filter, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface SalesPrice {
  id: string;
  item: FruitType;
  pack: string;
  sales_price: number;
  supplier?: string | null;  // NULL for items with uniform pricing (BANANAS), specific supplier for items with supplier-specific pricing (PINEAPPLES)
  year?: number;
  updated_at: string;
}

interface PurchasePrice {
  id: string;
  item: FruitType;
  pack: string;
  supplier: string;
  purchase_price: number;
  year?: number;
  updated_at: string;
}

interface PriceManagementProps {
  selectedFruit: FruitType;
  onPriceUpdate?: () => void;
  allPacks?: string[];
  allSuppliers?: string[];
  availableYears?: number[];
}

export function PriceManagement({ selectedFruit, onPriceUpdate, allPacks = [], allSuppliers = [], availableYears = [] }: PriceManagementProps) {
  const { isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [salesPrices, setSalesPrices] = useState<SalesPrice[]>([]);
  const [purchasePrices, setPurchasePrices] = useState<PurchasePrice[]>([]);
  const [availablePacksFromData, setAvailablePacksFromData] = useState<string[]>([]);
  const [availableSuppliersFromData, setAvailableSuppliersFromData] = useState<string[]>([]);
  const [editingSalesPrice, setEditingSalesPrice] = useState<{ pack: string; supplier?: string; price: number } | null>(null);
  const [editingPurchasePrice, setEditingPurchasePrice] = useState<{ pack: string; supplier: string; price: number } | null>(null);
  const [editingBulkSalesPrice, setEditingBulkSalesPrice] = useState<{ pack: string; price: number } | null>(null);
  const [editingBulkPurchasePrice, setEditingBulkPurchasePrice] = useState<{ pack: string; price: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filterFruit, setFilterFruit] = useState<FruitType>(selectedFruit);
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());

  // Get unique packs - ONLY from shipping_records for the selected year/fruit
  // This ensures we only show packs that actually have data (cartons) for that combination
  const packs = useMemo(() => {
    // Only use packs from shipping_records - no fallback to prices or props
    // If no shipping data exists for this year/fruit, show empty (correct behavior)
    return [...availablePacksFromData].sort();
  }, [availablePacksFromData]);

  // Get unique suppliers - ONLY from shipping_records for the selected year/fruit
  // This ensures we only show suppliers that actually have data (cartons) for that combination
  const suppliers = useMemo(() => {
    // Only use suppliers from shipping_records - no fallback to prices or props
    // If no shipping data exists for this year/fruit, show empty (correct behavior)
    return [...availableSuppliersFromData].sort();
  }, [availableSuppliersFromData]);

  // Get unique years from availableYears or generate from current year
  const years = useMemo(() => {
    if (availableYears.length > 0) {
      return availableYears.sort((a, b) => b - a);
    }
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];
  }, [availableYears]);

  // Sync filterFruit with selectedFruit when dialog opens
  useEffect(() => {
    if (isOpen) {
      setFilterFruit(selectedFruit);
    }
  }, [isOpen, selectedFruit]);

  // Fetch prices from Supabase
  useEffect(() => {
    if (isOpen) {
      fetchPrices();
    }
  }, [isOpen, filterFruit, filterYear]);

  const fetchPrices = async () => {
    setIsLoading(true);
    try {
      if (!supabase) {
        toast.error('Database not configured');
        return;
      }

      // Ensure fruit is uppercase (database constraint requires 'BANANAS' or 'PINEAPPLES')
      const normalizedFruit = filterFruit.toUpperCase() as FruitType;
      
      console.log('🔍 Fetching prices for:', { fruit: normalizedFruit, year: filterYear });

      // Reset available packs/suppliers before fetching
      setAvailablePacksFromData([]);
      setAvailableSuppliersFromData([]);

      // Fetch unique packs from shipping_records for the selected year and fruit
      try {
        // Use RPC call for distinct values to avoid hitting row limits
        const { data: packData, error: packError } = await supabase
          .rpc('get_distinct_packs', {
            p_year: filterYear,
            p_item: normalizedFruit
          });

        if (packError) {
          console.error('Error with RPC, falling back to regular query:', packError);
          
          // Fallback: fetch with high limit and use batch approach
          let allPacks = new Set<string>();
          let from = 0;
          const batchSize = 1000;
          let hasMore = true;

          while (hasMore) {
            const { data: batch, error: batchError } = await supabase
          .from('shipping_records')
          .select('pack')
              .eq('item', normalizedFruit)
              .eq('year', filterYear)
              .not('pack', 'is', null)
              .neq('pack', '')
              .range(from, from + batchSize - 1);

            if (batchError) {
              console.error('Error fetching packs batch:', batchError);
              break;
            }

            if (batch && batch.length > 0) {
              batch.forEach(record => {
                if (record.pack && record.pack.trim()) {
                  allPacks.add(record.pack.trim());
                }
              });
              from += batchSize;
              hasMore = batch.length === batchSize;
            } else {
              hasMore = false;
            }
          }
          
          const packsFromShipping = Array.from(allPacks).sort();
          setAvailablePacksFromData(packsFromShipping);
          
          // Fallback: If no packs from shipping_records, try to get from existing prices
          if (packsFromShipping.length === 0) {
            console.log('No packs from shipping_records, checking existing prices...');
            const { data: pricePackData } = await supabase
              .from('sales_prices')
              .select('pack')
              .eq('item', normalizedFruit)
          .eq('year', filterYear)
          .not('pack', 'is', null)
          .neq('pack', '');

            if (pricePackData && pricePackData.length > 0) {
          const packSet = new Set<string>();
              pricePackData.forEach(p => {
                if (p.pack && p.pack.trim()) {
                  packSet.add(p.pack.trim());
            }
          });
          setAvailablePacksFromData(Array.from(packSet).sort());
            }
          }
        } else if (packData && Array.isArray(packData)) {
          // RPC returns array of objects with 'pack' property: [{pack: '7C'}, {pack: '8C'}]
          const uniquePacks = [...new Set(
            packData
              .map(item => typeof item === 'string' ? item : item.pack) // Handle both string and object
              .filter(p => p && typeof p === 'string' && p.trim())
          )].sort();
          console.log('📦 Packs from RPC:', uniquePacks);
          setAvailablePacksFromData(uniquePacks);
          
          // Fallback: If no packs from shipping_records, try to get from existing prices
          if (uniquePacks.length === 0) {
            console.log('⚠️ No packs from shipping_records, checking existing prices...');
            const { data: pricePackData } = await supabase
              .from('sales_prices')
              .select('pack')
              .eq('item', normalizedFruit)
              .eq('year', filterYear)
              .not('pack', 'is', null)
              .neq('pack', '');
            
            console.log('📦 Packs from sales_prices:', pricePackData?.length || 0);
            
            if (pricePackData && pricePackData.length > 0) {
              const packSet = new Set<string>();
              pricePackData.forEach(p => {
                if (p.pack && p.pack.trim()) {
                  packSet.add(p.pack.trim());
                }
              });
              const fallbackPacks = Array.from(packSet).sort();
              console.log('📦 Fallback packs:', fallbackPacks);
              setAvailablePacksFromData(fallbackPacks);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching packs from shipping_records:', err);
      }

      // Fetch unique suppliers from shipping_records for the selected year and fruit
      try {
        // Use RPC call for distinct values to avoid hitting row limits
        // This ensures we get ALL unique suppliers, not just first 1000 records
        const { data: supplierData, error: supplierError } = await supabase
          .rpc('get_distinct_suppliers', {
            p_year: filterYear,
            p_item: normalizedFruit
          });

        if (supplierError) {
          console.error('Error with RPC, falling back to regular query:', supplierError);
          
          // Fallback: fetch with high limit and use batch approach
          let allSuppliers = new Set<string>();
          let from = 0;
          const batchSize = 1000;
          let hasMore = true;

          while (hasMore) {
            const { data: batch, error: batchError } = await supabase
          .from('shipping_records')
          .select('supplier')
              .eq('item', normalizedFruit)
              .eq('year', filterYear)
              .not('supplier', 'is', null)
              .neq('supplier', '')
              .range(from, from + batchSize - 1);

            if (batchError) {
              console.error('Error fetching suppliers batch:', batchError);
              break;
            }

            if (batch && batch.length > 0) {
              batch.forEach(record => {
                if (record.supplier && record.supplier.trim()) {
                  allSuppliers.add(record.supplier.trim());
                }
              });
              from += batchSize;
              hasMore = batch.length === batchSize;
            } else {
              hasMore = false;
            }
          }
          
          const suppliersFromShipping = Array.from(allSuppliers).sort();
          setAvailableSuppliersFromData(suppliersFromShipping);
          
          // Fallback: If no suppliers from shipping_records, try to get from existing prices
          if (suppliersFromShipping.length === 0) {
            console.log('No suppliers from shipping_records, checking existing prices...');
            const { data: priceSupplierData } = await supabase
              .from('purchase_prices')
              .select('supplier')
              .eq('item', normalizedFruit)
          .eq('year', filterYear)
          .not('supplier', 'is', null)
          .neq('supplier', '');

            if (priceSupplierData && priceSupplierData.length > 0) {
          const supplierSet = new Set<string>();
              priceSupplierData.forEach(p => {
                if (p.supplier && p.supplier.trim()) {
                  supplierSet.add(p.supplier.trim());
            }
          });
          setAvailableSuppliersFromData(Array.from(supplierSet).sort());
            }
          }
        } else if (supplierData && Array.isArray(supplierData)) {
          // RPC returns array of objects with 'supplier' property: [{supplier: 'LAPANDAY'}, {supplier: 'PHILPACK'}]
          const uniqueSuppliers = [...new Set(
            supplierData
              .map(item => typeof item === 'string' ? item : item.supplier) // Handle both string and object
              .filter(s => s && typeof s === 'string' && s.trim())
          )].sort();
          console.log('👥 Suppliers from RPC:', uniqueSuppliers);
          setAvailableSuppliersFromData(uniqueSuppliers);
          
          // Fallback: If no suppliers from shipping_records, try to get from existing prices
          if (uniqueSuppliers.length === 0) {
            console.log('⚠️ No suppliers from shipping_records, checking existing prices...');
            const { data: priceSupplierData } = await supabase
              .from('purchase_prices')
              .select('supplier')
              .eq('item', normalizedFruit)
              .eq('year', filterYear)
              .not('supplier', 'is', null)
              .neq('supplier', '');
            
            console.log('👥 Suppliers from purchase_prices:', priceSupplierData?.length || 0);
            
            if (priceSupplierData && priceSupplierData.length > 0) {
              const supplierSet = new Set<string>();
              priceSupplierData.forEach(p => {
                if (p.supplier && p.supplier.trim()) {
                  supplierSet.add(p.supplier.trim());
                }
              });
              const fallbackSuppliers = Array.from(supplierSet).sort();
              console.log('👥 Fallback suppliers:', fallbackSuppliers);
              setAvailableSuppliersFromData(fallbackSuppliers);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching suppliers from shipping_records:', err);
      }

      // Try to fetch sales prices with year and supplier columns
      let salesData: any[] = [];
      let salesError: any = null;
      
      try {
        let salesQuery = supabase
          .from('sales_prices')
          .select('id, item, pack, sales_price, supplier, year, updated_at')
          .eq('item', normalizedFruit)
          .eq('year', filterYear);
        
        const result = await salesQuery.order('pack').order('supplier');
        salesData = result.data || [];
        salesError = result.error;
      } catch (err: any) {
        salesError = err;
      }

      // If error about columns, fetch with minimal fields
      if (salesError && (salesError.code === 'PGRST116' || salesError.message?.includes('year') || salesError.message?.includes('column'))) {
        console.warn('Column issue, fetching with minimal fields');
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('sales_prices')
          .select('id, item, pack, sales_price, updated_at')
          .eq('item', normalizedFruit)
          .order('pack');
        
        if (fallbackError) {
          console.error('Error fetching sales prices:', fallbackError);
          throw fallbackError;
        }
        salesData = fallbackData || [];
      } else if (salesError) {
        console.error('Error fetching sales prices:', salesError);
        throw salesError;
      }

      setSalesPrices(salesData);

      // Try to fetch purchase prices with year column first
      let purchaseData: any[] = [];
      let purchaseError: any = null;
      
      try {
        let purchaseQuery = supabase
          .from('purchase_prices')
          .select('id, item, pack, supplier, purchase_price, year, updated_at')
          .eq('item', normalizedFruit)
          .eq('year', filterYear);
        
        const result = await purchaseQuery
          .order('pack')
          .order('supplier');
        
        purchaseData = result.data || [];
        purchaseError = result.error;
      } catch (err: any) {
        purchaseError = err;
      }

      // If error about year column, fetch without year (fallback for old schema)
      // Note: This fallback should only be used if year column doesn't exist in schema
      // In normal operation, prices are strictly isolated by item AND year
      if (purchaseError && (purchaseError.code === 'PGRST116' || purchaseError.message?.includes('year') || purchaseError.message?.includes('column'))) {
        console.warn('Year column issue, fetching without year filter (fallback mode)');
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('purchase_prices')
          .select('id, item, pack, supplier, purchase_price, updated_at')
          .eq('item', normalizedFruit)
          .order('pack')
          .order('supplier');
        
        if (fallbackError) {
          console.error('Error fetching purchase prices:', fallbackError);
          throw fallbackError;
        }
        purchaseData = fallbackData || [];
      } else if (purchaseError) {
        console.error('Error fetching purchase prices:', purchaseError);
        throw purchaseError;
      }

      setPurchasePrices(purchaseData);

      // Prices are set in the error handling above
    } catch (error: any) {
      console.error('Error fetching prices:', error);
      toast.error('Failed to load prices');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSalesPrice = async () => {
    if (!editingSalesPrice) return;
    
    if (!isAdmin) {
      toast.error('Only administrators can edit prices');
      setEditingSalesPrice(null);
      return;
    }

    setIsSaving(true);
    try {
      if (!supabase) {
        toast.error('Database not configured');
        return;
      }

      // Ensure fruit is uppercase
      const normalizedFruit = filterFruit.toUpperCase() as FruitType;

      const priceData = {
        item: normalizedFruit,
        pack: editingSalesPrice.pack,
        sales_price: editingSalesPrice.price,
        supplier: editingSalesPrice.supplier || null,
        year: filterYear,
      };

      // Build query to find existing record
      let query = supabase
        .from('sales_prices')
        .select('id')
        .eq('item', normalizedFruit)
        .eq('pack', editingSalesPrice.pack)
        .eq('year', filterYear);
      
      // Add supplier filter
      if (editingSalesPrice.supplier) {
        query = query.eq('supplier', editingSalesPrice.supplier);
      } else {
        query = query.is('supplier', null);
      }
      
      const { data: existingRecord, error: findError } = await query.maybeSingle();

      if (findError && findError.code !== 'PGRST116') {
        console.error('Error finding sales price:', findError);
        toast.error('Failed to find existing price: ' + (findError.message || 'Unknown error'));
        throw findError;
      }

      let result;
      if (existingRecord?.id) {
        // Update existing record
        result = await supabase
          .from('sales_prices')
          .update(priceData)
          .eq('id', existingRecord.id)
          .select();
      } else {
        // Insert new record
        result = await supabase
          .from('sales_prices')
          .insert(priceData)
          .select();
      }

      if (result.error) {
        console.error('Error saving sales price:', result.error);
        console.error('Error details:', {
          code: result.error.code,
          message: result.error.message,
          details: result.error.details,
          hint: result.error.hint,
        });
        toast.error('Failed to save sales price: ' + (result.error.message || 'Unknown error'));
        throw result.error;
      }

      if (!result.data || result.data.length === 0) {
        console.error('No data returned from save operation');
        toast.error('Failed to save sales price: No data returned');
        throw new Error('No data returned');
      }

      toast.success('Sales price updated successfully');
      setEditingSalesPrice(null);
      await fetchPrices();
      onPriceUpdate?.();
    } catch (error: any) {
      console.error('Error saving sales price:', error);
      if (!error.message || !error.message.includes('Failed to')) {
        toast.error('Failed to save sales price: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePurchasePrice = async () => {
    if (!editingPurchasePrice) return;
    
    if (!isAdmin) {
      toast.error('Only administrators can edit prices');
      setEditingPurchasePrice(null);
      return;
    }

    setIsSaving(true);
    try {
      if (!supabase) {
        toast.error('Database not configured');
        return;
      }

      // Ensure fruit is uppercase
      const normalizedFruit = filterFruit.toUpperCase() as FruitType;

      const priceData = {
        item: normalizedFruit,
        pack: editingPurchasePrice.pack,
        supplier: editingPurchasePrice.supplier,
        purchase_price: editingPurchasePrice.price,
        year: filterYear,
      };

      // First, try to find existing record by item, pack, supplier, and year
      const { data: existingRecord, error: findError } = await supabase
        .from('purchase_prices')
        .select('id')
        .eq('item', normalizedFruit)
        .eq('pack', editingPurchasePrice.pack)
        .eq('supplier', editingPurchasePrice.supplier)
        .eq('year', filterYear)
        .maybeSingle();

      if (findError && findError.code !== 'PGRST116') {
        console.error('Error finding purchase price:', findError);
        toast.error('Failed to find existing price: ' + (findError.message || 'Unknown error'));
        throw findError;
      }

      let result;
      if (existingRecord?.id) {
        // Update existing record
        result = await supabase
          .from('purchase_prices')
          .update(priceData)
          .eq('id', existingRecord.id)
          .select();
      } else {
        // Insert new record
        result = await supabase
          .from('purchase_prices')
          .insert(priceData)
          .select();
      }

      if (result.error) {
        console.error('Error saving purchase price:', result.error);
        console.error('Error details:', {
          code: result.error.code,
          message: result.error.message,
          details: result.error.details,
          hint: result.error.hint,
        });
        toast.error('Failed to save purchase price: ' + (result.error.message || 'Unknown error'));
        throw result.error;
      }

      if (!result.data || result.data.length === 0) {
        console.error('No data returned from save operation');
        toast.error('Failed to save purchase price: No data returned');
        throw new Error('No data returned');
      }

      toast.success('Purchase price updated successfully');
      setEditingPurchasePrice(null);
      await fetchPrices();
      onPriceUpdate?.();
    } catch (error: any) {
      console.error('Error saving purchase price:', error);
      if (!error.message || !error.message.includes('Failed to')) {
        toast.error('Failed to save purchase price: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBulkSalesPrice = async () => {
    if (!editingBulkSalesPrice) return;
    
    if (!isAdmin) {
      toast.error('Only administrators can edit prices');
      setEditingBulkSalesPrice(null);
      return;
    }

    setIsSaving(true);
    try {
      if (!supabase) {
        toast.error('Database not configured');
        return;
      }

      // Ensure fruit is uppercase
      const normalizedFruit = filterFruit.toUpperCase() as FruitType;

      let successCount = 0;
      let errorCount = 0;

      // Update each supplier individually (handles partial indexes properly)
      for (const supplier of suppliers) {
        try {
          const priceData = {
            item: normalizedFruit,
            pack: editingBulkSalesPrice.pack,
            supplier,
            sales_price: editingBulkSalesPrice.price,
            year: filterYear,
          };

          // Check if record exists
          const { data: existing } = await supabase
            .from('sales_prices')
            .select('id')
            .eq('item', normalizedFruit)
            .eq('pack', editingBulkSalesPrice.pack)
            .eq('supplier', supplier)
            .eq('year', filterYear)
            .maybeSingle();

          if (existing?.id) {
            // Update existing
            await supabase
              .from('sales_prices')
              .update(priceData)
              .eq('id', existing.id);
          } else {
            // Insert new
            await supabase
              .from('sales_prices')
              .insert(priceData);
          }
          successCount++;
        } catch (err) {
          console.error(`Error saving price for ${supplier}:`, err);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Set sales price for ${successCount} supplier${successCount > 1 ? 's' : ''} successfully!`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to save ${errorCount} price${errorCount > 1 ? 's' : ''}`);
      }

      setEditingBulkSalesPrice(null);
      await fetchPrices();
      onPriceUpdate?.();
    } catch (error: any) {
      console.error('Error saving bulk sales prices:', error);
      toast.error('Failed to save bulk prices: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBulkPurchasePrice = async () => {
    if (!editingBulkPurchasePrice) return;
    
    if (!isAdmin) {
      toast.error('Only administrators can edit prices');
      setEditingBulkPurchasePrice(null);
      return;
    }

    setIsSaving(true);
    try {
      if (!supabase) {
        toast.error('Database not configured');
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      // Ensure fruit is uppercase
      const normalizedFruit = filterFruit.toUpperCase() as FruitType;

      // Update each supplier individually
      for (const supplier of suppliers) {
        try {
          const priceData = {
            item: normalizedFruit,
            pack: editingBulkPurchasePrice.pack,
            supplier,
            purchase_price: editingBulkPurchasePrice.price,
            year: filterYear,
          };

          // Check if record exists
          const { data: existing } = await supabase
            .from('purchase_prices')
            .select('id')
            .eq('item', normalizedFruit)
            .eq('pack', editingBulkPurchasePrice.pack)
            .eq('supplier', supplier)
            .eq('year', filterYear)
            .maybeSingle();

          if (existing?.id) {
            // Update existing
            await supabase
              .from('purchase_prices')
              .update(priceData)
              .eq('id', existing.id);
          } else {
            // Insert new
            await supabase
              .from('purchase_prices')
              .insert(priceData);
          }
          successCount++;
        } catch (err) {
          console.error(`Error saving price for ${supplier}:`, err);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Set purchase price for ${successCount} supplier${successCount > 1 ? 's' : ''} successfully!`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to save ${errorCount} price${errorCount > 1 ? 's' : ''}`);
      }

      setEditingBulkPurchasePrice(null);
      await fetchPrices();
      onPriceUpdate?.();
    } catch (error: any) {
      console.error('Error saving bulk purchase prices:', error);
      toast.error('Failed to save bulk prices: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const getSalesPrice = (pack: string, supplier?: string) => {
    // Always use supplier-specific pricing for both fruits
    // Strictly filter by year to ensure isolation
    if (supplier) {
      return salesPrices.find(p => 
        p.pack === pack && 
        p.supplier === supplier && 
        p.item === filterFruit.toUpperCase() &&
        p.year === filterYear
      );
    }
    return undefined;
  };

  const getPurchasePrice = (pack: string, supplier: string) => {
    // Strictly filter by year and fruit to ensure isolation
    return purchasePrices.find(p => 
      p.pack === pack && 
      p.supplier === supplier && 
      p.item === filterFruit.toUpperCase() &&
      p.year === filterYear
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="w-4 h-4" />
            Manage Prices
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-7xl max-h-[90vh]">
          <DialogHeader className="pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-xl font-heading">
              <Settings className="w-5 h-5 text-primary" />
              Price Management
            </DialogTitle>
          </DialogHeader>
          
          {/* Filters - Compact Design */}
          <div className="flex items-center gap-3 px-3 py-2.5 bg-muted/40 rounded-lg border border-border/50">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <Label htmlFor="fruit-filter" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Fruit:
              </Label>
              <Select value={filterFruit} onValueChange={(v) => setFilterFruit(v as FruitType)}>
                <SelectTrigger id="fruit-filter" className="w-36 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANANAS">Bananas</SelectItem>
                  <SelectItem value="PINEAPPLES">Pineapples</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Label htmlFor="year-filter" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Year:
              </Label>
              <Select 
                value={filterYear.toString()} 
                onValueChange={(v) => setFilterYear(parseInt(v))}
              >
                <SelectTrigger id="year-filter" className="w-28 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1" />
            
            <div className="text-[10px] text-muted-foreground font-medium">
              {filterYear} prices
            </div>
          </div>
          
          <ScrollArea className="max-h-[68vh] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Loading prices...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Sales Prices Section */}
                <div className="bg-card border border-border rounded-lg shadow-sm">
                  {/* Compact Header */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-primary" />
                      <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">Sales Prices</h3>
                      {!isAdmin && (
                        <Lock className="w-3 h-3 text-muted-foreground" title="Read-only: Admin only" />
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      USD per carton • Varies by pack & supplier {isAdmin && '• Click pack to set all'}
                      {!isAdmin && '• Read-only'}
                    </span>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 border-b border-border h-8">
                          <TableHead className="w-32 text-[10px] font-semibold py-1.5 px-2 bg-muted/60 sticky left-0 z-20 border-r border-border">
                            Pack
                          </TableHead>
                          {suppliers.length === 0 ? (
                            <TableHead className="text-center text-[10px] py-1.5 px-2">
                              <span className="text-muted-foreground">No suppliers</span>
                          </TableHead>
                          ) : (
                            suppliers.map(supplier => (
                              <TableHead key={supplier} className="text-right text-[10px] font-semibold min-w-[95px] py-1.5 px-2 whitespace-nowrap">
                                <div className="truncate" title={supplier}>{supplier}</div>
                              </TableHead>
                            ))
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {packs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={suppliers.length + 1} className="text-center text-xs text-muted-foreground py-6">
                              No packs available
                            </TableCell>
                          </TableRow>
                        ) : (
                          packs.map(pack => (
                              <TableRow key={pack} className="hover:bg-muted/5 border-b border-border/50 transition-colors duration-100">
                              <TableCell 
                                onClick={isAdmin ? () => setEditingBulkSalesPrice({ pack, price: 0 }) : undefined}
                                className={cn(
                                  "font-semibold text-[11px] py-1.5 px-2 bg-muted/30 border-r border-border sticky left-0 z-10 transition-colors",
                                  isAdmin ? "cursor-pointer hover:bg-primary/10" : "cursor-not-allowed opacity-75"
                                )}
                                title={isAdmin ? `Click to set same price for all suppliers: ${pack}` : 'Only administrators can edit prices'}
                              >
                                {pack}
                              </TableCell>
                              {suppliers.length === 0 ? (
                                <TableCell colSpan={1} className="text-center text-xs text-muted-foreground py-4">
                                  No suppliers
                                </TableCell>
                              ) : (
                                suppliers.map(supplier => {
                                  const price = getSalesPrice(pack, supplier);
                                  const hasPrice = price?.sales_price;
                                  return (
                                    <TableCell
                                      key={supplier}
                                      onClick={isAdmin ? () => setEditingSalesPrice({
                                        pack,
                                        supplier,
                                        price: price?.sales_price || 0
                                      }) : undefined}
                                      className={cn(
                                        "text-right text-[11px] py-1.5 px-2 transition-all duration-100 whitespace-nowrap",
                                        isAdmin ? "cursor-pointer hover:bg-primary/8" : "cursor-not-allowed opacity-75",
                                        hasPrice && "font-medium"
                                      )}
                                      title={isAdmin ? `Click to edit: ${pack} - ${supplier}` : 'Only administrators can edit prices'}
                                    >
                                      {hasPrice ? (
                                        <span className="text-primary font-semibold">${price.sales_price.toFixed(2)}</span>
                                      ) : (
                                        <span className="text-muted-foreground text-[10px]">-</span>
                                      )}
                                </TableCell>
                            );
                          })
                              )}
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Purchase Prices Section */}
                <div className="bg-card border border-border rounded-lg shadow-sm">
                  {/* Compact Header */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-accent" />
                      <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">Purchase Prices</h3>
                      {!isAdmin && (
                        <Lock className="w-3 h-3 text-muted-foreground" title="Read-only: Admin only" />
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      USD per carton • Varies by pack & supplier {isAdmin && '• Click pack to set all'}
                      {!isAdmin && '• Read-only'}
                    </span>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 border-b border-border h-8">
                          <TableHead className="w-32 text-[10px] font-semibold py-1.5 px-2 bg-muted/60 sticky left-0 z-20 border-r border-border">
                            Pack
                          </TableHead>
                          {suppliers.length === 0 ? (
                            <TableHead className="text-center text-[10px] py-1.5 px-2">
                              <span className="text-muted-foreground">No suppliers</span>
                            </TableHead>
                          ) : (
                            suppliers.map(supplier => (
                              <TableHead key={supplier} className="text-right text-[10px] font-semibold min-w-[95px] py-1.5 px-2 whitespace-nowrap">
                                <div className="truncate" title={supplier}>{supplier}</div>
                              </TableHead>
                            ))
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {packs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={suppliers.length + 1} className="text-center text-xs text-muted-foreground py-6">
                              No packs available
                            </TableCell>
                          </TableRow>
                        ) : (
                          packs.map(pack => (
                            <TableRow key={pack} className="hover:bg-muted/5 border-b border-border/50 transition-colors duration-100">
                              <TableCell 
                                onClick={isAdmin ? () => setEditingBulkPurchasePrice({ pack, price: 0 }) : undefined}
                                className={cn(
                                  "font-semibold text-[11px] py-1.5 px-2 bg-muted/30 border-r border-border sticky left-0 z-10 transition-colors",
                                  isAdmin ? "cursor-pointer hover:bg-accent/10" : "cursor-not-allowed opacity-75"
                                )}
                                title={isAdmin ? `Click to set same price for all suppliers: ${pack}` : 'Only administrators can edit prices'}
                              >
                                {pack}
                              </TableCell>
                              {suppliers.length === 0 ? (
                                <TableCell colSpan={1} className="text-center text-xs text-muted-foreground py-4">
                                  No suppliers
                                </TableCell>
                              ) : (
                                suppliers.map(supplier => {
                                  const price = getPurchasePrice(pack, supplier);
                                  const hasPrice = price?.purchase_price;
                                  return (
                                    <TableCell
                                      key={supplier}
                                      onClick={isAdmin ? () => setEditingPurchasePrice({
                                        pack,
                                        supplier,
                                        price: price?.purchase_price || 0
                                      }) : undefined}
                                      className={cn(
                                        "text-right text-[11px] py-1.5 px-2 transition-all duration-100 whitespace-nowrap",
                                        isAdmin ? "cursor-pointer hover:bg-primary/8" : "cursor-not-allowed opacity-75",
                                        hasPrice && "font-medium"
                                      )}
                                      title={isAdmin ? `Click to edit: ${pack} - ${supplier}` : 'Only administrators can edit prices'}
                                    >
                                      {hasPrice ? (
                                        <span className="text-accent font-semibold">${price.purchase_price.toFixed(2)}</span>
                                      ) : (
                                        <span className="text-muted-foreground text-[10px]">-</span>
                                      )}
                                    </TableCell>
                                  );
                                })
                              )}
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Edit Sales Price Dialog */}
      {editingSalesPrice && (
        <Dialog open={!!editingSalesPrice} onOpenChange={() => setEditingSalesPrice(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader className="pb-3 border-b border-border">
              <DialogTitle className="flex items-center gap-2 text-lg font-heading">
                <DollarSign className="w-4 h-4 text-primary" />
                Edit Sales Price
                {!isAdmin && (
                  <span className="text-xs text-muted-foreground font-normal flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    (Read-only)
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-muted/40 p-3 rounded-lg border border-border/50">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium uppercase tracking-wide">Fruit:</span>
                    <span className="font-semibold">{filterFruit}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium uppercase tracking-wide">Pack:</span>
                    <span className="font-semibold">{editingSalesPrice.pack}</span>
                  </div>
                  {editingSalesPrice.supplier && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium uppercase tracking-wide">Supplier:</span>
                      <span className="font-semibold">{editingSalesPrice.supplier}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium uppercase tracking-wide">Year:</span>
                    <span className="font-semibold">{filterYear}</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-[10px] text-muted-foreground">
                    This price is specific to this supplier and pack combination.
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sales-price" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Sales Price (USD per carton)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
                  <Input
                    id="sales-price"
                    type="number"
                    step="0.01"
                    value={editingSalesPrice.price}
                    onChange={(e) => setEditingSalesPrice({
                      ...editingSalesPrice,
                      price: parseFloat(e.target.value) || 0
                    })}
                    className="pl-8 text-sm font-semibold"
                    placeholder="0.00"
                    disabled={!isAdmin}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditingSalesPrice(null)} size="sm" className="text-xs">
                  Cancel
                </Button>
                <Button onClick={handleSaveSalesPrice} disabled={isSaving || !isAdmin} size="sm" className="text-xs">
                  {isSaving ? 'Saving...' : 'Save Price'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Purchase Price Dialog */}
      {editingPurchasePrice && (
        <Dialog open={!!editingPurchasePrice} onOpenChange={() => setEditingPurchasePrice(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader className="pb-3 border-b border-border">
              <DialogTitle className="flex items-center gap-2 text-lg font-heading">
                <ShoppingCart className="w-4 h-4 text-accent" />
                Edit Purchase Price
                {!isAdmin && (
                  <span className="text-xs text-muted-foreground font-normal flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    (Read-only)
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-muted/40 p-3 rounded-lg border border-border/50">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium uppercase tracking-wide">Fruit:</span>
                    <span className="font-semibold">{filterFruit}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium uppercase tracking-wide">Pack:</span>
                    <span className="font-semibold">{editingPurchasePrice.pack}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium uppercase tracking-wide">Supplier:</span>
                    <span className="font-semibold">{editingPurchasePrice.supplier}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium uppercase tracking-wide">Year:</span>
                    <span className="font-semibold">{filterYear}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="purchase-price" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Purchase Price (USD per carton)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
                  <Input
                    id="purchase-price"
                    type="number"
                    step="0.01"
                    value={editingPurchasePrice.price}
                    onChange={(e) => setEditingPurchasePrice({
                      ...editingPurchasePrice,
                      price: parseFloat(e.target.value) || 0
                    })}
                    className="pl-8 text-sm font-semibold"
                    placeholder="0.00"
                    disabled={!isAdmin}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditingPurchasePrice(null)} size="sm" className="text-xs">
                  Cancel
                </Button>
                <Button onClick={handleSavePurchasePrice} disabled={isSaving || !isAdmin} size="sm" className="text-xs">
                  {isSaving ? 'Saving...' : 'Save Price'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk Edit Sales Price Dialog */}
      {editingBulkSalesPrice && (
        <Dialog open={!!editingBulkSalesPrice} onOpenChange={() => setEditingBulkSalesPrice(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader className="pb-3 border-b border-border">
              <DialogTitle className="flex items-center gap-2 text-lg font-heading">
                <DollarSign className="w-4 h-4 text-primary" />
                Set Sales Price for All Suppliers
                {!isAdmin && (
                  <span className="text-xs text-muted-foreground font-normal flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    (Read-only)
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-muted/40 p-3 rounded-lg border border-border/50">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium uppercase tracking-wide">Fruit:</span>
                    <span className="font-semibold">{filterFruit}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium uppercase tracking-wide">Pack:</span>
                    <span className="font-semibold">{editingBulkSalesPrice.pack}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium uppercase tracking-wide">Year:</span>
                    <span className="font-semibold">{filterYear}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium uppercase tracking-wide">Suppliers:</span>
                    <span className="font-semibold">{suppliers.length}</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-[10px] text-muted-foreground">
                    This price will be applied to ALL {suppliers.length} suppliers for this pack.
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bulk-sales-price" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Sales Price (USD per carton)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
                  <Input
                    id="bulk-sales-price"
                    type="number"
                    step="0.01"
                    value={editingBulkSalesPrice.price}
                    onChange={(e) => setEditingBulkSalesPrice({
                      ...editingBulkSalesPrice,
                      price: parseFloat(e.target.value) || 0
                    })}
                    className="pl-8 text-sm font-semibold"
                    placeholder="0.00"
                    autoFocus
                    disabled={!isAdmin}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditingBulkSalesPrice(null)} size="sm" className="text-xs">
                  Cancel
                </Button>
                <Button onClick={handleSaveBulkSalesPrice} disabled={isSaving || !isAdmin} size="sm" className="text-xs">
                  {isSaving ? 'Saving...' : `Set for ${suppliers.length} Suppliers`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk Edit Purchase Price Dialog */}
      {editingBulkPurchasePrice && (
        <Dialog open={!!editingBulkPurchasePrice} onOpenChange={() => setEditingBulkPurchasePrice(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader className="pb-3 border-b border-border">
              <DialogTitle className="flex items-center gap-2 text-lg font-heading">
                <ShoppingCart className="w-4 h-4 text-accent" />
                Set Purchase Price for All Suppliers
                {!isAdmin && (
                  <span className="text-xs text-muted-foreground font-normal flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    (Read-only)
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-muted/40 p-3 rounded-lg border border-border/50">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium uppercase tracking-wide">Fruit:</span>
                    <span className="font-semibold">{filterFruit}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium uppercase tracking-wide">Pack:</span>
                    <span className="font-semibold">{editingBulkPurchasePrice.pack}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium uppercase tracking-wide">Year:</span>
                    <span className="font-semibold">{filterYear}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium uppercase tracking-wide">Suppliers:</span>
                    <span className="font-semibold">{suppliers.length}</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-[10px] text-muted-foreground">
                    This price will be applied to ALL {suppliers.length} suppliers for this pack.
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bulk-purchase-price" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Purchase Price (USD per carton)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
                  <Input
                    id="bulk-purchase-price"
                    type="number"
                    step="0.01"
                    value={editingBulkPurchasePrice.price}
                    onChange={(e) => setEditingBulkPurchasePrice({
                      ...editingBulkPurchasePrice,
                      price: parseFloat(e.target.value) || 0
                    })}
                    className="pl-8 text-sm font-semibold"
                    placeholder="0.00"
                    autoFocus
                    disabled={!isAdmin}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditingBulkPurchasePrice(null)} size="sm" className="text-xs">
                  Cancel
                </Button>
                <Button onClick={handleSaveBulkPurchasePrice} disabled={isSaving || !isAdmin} size="sm" className="text-xs">
                  {isSaving ? 'Saving...' : `Set for ${suppliers.length} Suppliers`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

