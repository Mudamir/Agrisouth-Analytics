import { useState, useMemo, useEffect } from 'react';
import { FruitType } from '@/types/shipping';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, DollarSign, ShoppingCart, Filter, Lock, TrendingUp, Calendar, Package, Loader2, Sparkles, Banana, Coins } from 'lucide-react';
import { PineappleIcon } from '../PineappleIcon';
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
    // Custom sort function for banana packs: 13.5 KG B -> 13.5 KG A -> 7.2 KG -> 6 KG -> 3 KG -> 18 KG
    const getPackSortOrder = (pack: string): number => {
      const packUpper = pack.toUpperCase().trim();
      
      // Check if it's a pineapple pack (pattern: number followed by 'C', e.g., 7C, 8C, 9C)
      const pineappleMatch = packUpper.match(/^(\d+)C$/);
      if (pineappleMatch) {
        const number = parseInt(pineappleMatch[1], 10);
        return number; // Pineapples: ascending order (7C, 8C, 9C, etc.)
      }
      
      // Banana pack sorting - Order: 13.5 KG A (first) -> 13.5 KG SH -> 13.5 KG B -> 7.2 KG -> 6 KG -> 3 KG -> 18 KG (last)
      // 1. 13.5 KG A (first)
      if (packUpper === '13.5 KG A' || packUpper === '13 KG A' || 
          (packUpper.includes('13.5') && packUpper.includes('A') && !packUpper.includes('B') && !packUpper.includes('SH')) ||
          (packUpper.includes('13') && packUpper.includes('KG') && packUpper.includes('A') && !packUpper.includes('B') && !packUpper.includes('SH'))) {
        return 1;
      }
      // 2. 13.5 KG SH
      if (packUpper === '13.5 KG SH' || packUpper === '13KG SH' || packUpper === '13 KG SH' ||
          (packUpper.includes('13.5') && (packUpper.includes('SH') || packUpper.includes('S/H'))) ||
          (packUpper.includes('13') && packUpper.includes('KG') && (packUpper.includes('SH') || packUpper.includes('S/H')))) {
        return 2;
      }
      // 3. 13.5 KG B
      if (packUpper === '13.5 KG B' || packUpper === '13KG B' || packUpper === '13 KG B' ||
          (packUpper.includes('13.5') && packUpper.includes('B')) ||
          (packUpper.includes('13') && packUpper.includes('KG') && packUpper.includes('B'))) {
        return 3;
      }
      // 4. 7KG or 7.2 KG A
      if (packUpper === '7KG' || packUpper === '7.2 KG A' || 
          (packUpper.match(/^7\s*KG/i) || packUpper.match(/^7\.2\s*KG/i)) && !packUpper.includes('13.5') && !packUpper.includes('17') && !packUpper.includes('27')) {
        return 4;
      }
      // 5. 6KG
      if (packUpper === '6KG' || (packUpper.match(/^6\s*KG/i) && !packUpper.includes('13.5') && !packUpper.includes('16') && !packUpper.includes('26'))) {
        return 5;
      }
      // 6. 3KG or 3 KG A
      if (packUpper === '3KG' || packUpper === '3 KG A' || 
          (packUpper.match(/^3\s*KG/i) && !packUpper.includes('13.5') && !packUpper.includes('13 KG'))) {
        return 6;
      }
      // 7. 18KG (last)
      if (packUpper === '18KG' || packUpper === '18 KG A' || packUpper.includes('18 KG')) {
        return 7;
      }
      
      // Default: sort alphabetically for any other packs
      return 999;
    };
    
    // Sort packs using custom order
    return [...availablePacksFromData].sort((a, b) => {
      const orderA = getPackSortOrder(a);
      const orderB = getPackSortOrder(b);
      
      // If both have defined order, sort by order
      if (orderA !== 999 && orderB !== 999) {
        return orderA - orderB;
      }
      // If only one has defined order, prioritize it
      if (orderA !== 999) return -1;
      if (orderB !== 999) return 1;
      // If neither has defined order, sort alphabetically
      return a.localeCompare(b);
    });
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
        <DialogContent className="max-w-7xl max-h-[90vh] p-0 gap-0">
          {/* Premium Header with Gradient */}
          <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-br from-primary/5 via-primary/3 to-secondary/5 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 flex items-center justify-center shadow-sm">
                  <Settings className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="flex items-center gap-2 text-2xl font-heading font-bold text-foreground">
                    Price Management
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Configure sales and purchase prices by pack and supplier
                  </p>
                </div>
              </div>
              {!isAdmin && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/60 border border-border/50 rounded-lg">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Read Only</span>
                </div>
              )}
            </div>
          </DialogHeader>
          
          {/* Enhanced Filters Section */}
          <div className="px-6 pt-4 pb-3 bg-muted/20 border-b border-border/50">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-background border border-border/50">
                  <Filter className="w-4 h-4 text-primary" />
                </div>
                <Label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  Fruit
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={filterFruit === 'BANANAS' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterFruit('BANANAS')}
                    className={cn(
                      "h-9 px-4 gap-2 transition-all duration-200",
                      filterFruit === 'BANANAS' 
                        ? "bg-primary text-primary-foreground shadow-sm" 
                        : "hover:bg-primary/10"
                    )}
                  >
                    <Banana className="w-4 h-4" />
                    <span className="text-sm font-medium">Bananas</span>
                  </Button>
                  <Button
                    type="button"
                    variant={filterFruit === 'PINEAPPLES' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterFruit('PINEAPPLES')}
                    className={cn(
                      "h-9 px-4 gap-2 transition-all duration-200",
                      filterFruit === 'PINEAPPLES' 
                        ? "bg-primary text-primary-foreground shadow-sm" 
                        : "hover:bg-primary/10"
                    )}
                  >
                    <PineappleIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">Pineapples</span>
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-background border border-border/50">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <Label htmlFor="year-filter" className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  Year
                </Label>
                <Select 
                  value={filterYear.toString()} 
                  onValueChange={(v) => setFilterYear(parseInt(v))}
                >
                  <SelectTrigger id="year-filter" className="w-32 h-9 text-sm font-medium border-border/60">
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
              
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg">
                <DollarSign className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">
                  {filterYear} Pricing
                </span>
              </div>
            </div>
          </div>
          
          <ScrollArea className="max-h-[calc(90vh-200px)] px-6 py-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Loading prices...</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Fetching data from database</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Sales Prices Section - Premium Design */}
                <div className="bg-gradient-to-br from-card to-card/95 border border-border/60 rounded-xl shadow-lg overflow-hidden">
                  {/* Enhanced Header */}
                  <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                        <DollarSign className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
                          Sales Prices
                          {!isAdmin && (
                            <Lock className="w-3.5 h-3.5 text-muted-foreground" title="Read-only: Admin only" />
                          )}
                        </h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          USD per carton • Varies by pack & supplier {isAdmin && '• Click pack name to bulk edit'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 border border-primary/20 rounded-lg">
                      <TrendingUp className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">
                        Revenue
                      </span>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40 border-b-2 border-border h-10">
                          <TableHead className="w-36 text-xs font-bold py-3 px-4 bg-gradient-to-r from-muted/80 to-muted/40 sticky left-0 z-20 border-r-2 border-border/60 shadow-sm">
                            <div className="flex items-center gap-2">
                              <Package className="w-3.5 h-3.5 text-primary" />
                              <span>Pack</span>
                            </div>
                          </TableHead>
                          {suppliers.length === 0 ? (
                            <TableHead className="text-center text-xs py-3 px-4">
                              <span className="text-muted-foreground font-medium">No suppliers available</span>
                          </TableHead>
                          ) : (
                            suppliers.map(supplier => (
                              <TableHead key={supplier} className="text-right text-xs font-bold min-w-[110px] py-3 px-4 whitespace-nowrap bg-muted/20">
                                <div className="truncate font-semibold" title={supplier}>{supplier}</div>
                              </TableHead>
                            ))
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {packs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={suppliers.length + 1} className="text-center py-12">
                              <div className="flex flex-col items-center gap-2">
                                <Package className="w-8 h-8 text-muted-foreground/40" />
                                <p className="text-sm font-medium text-muted-foreground">No packs available</p>
                                <p className="text-xs text-muted-foreground/70">No shipping data found for this year and fruit combination</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          packs.map((pack, packIndex) => (
                              <TableRow key={pack} className={cn(
                                "hover:bg-primary/3 border-b border-border/40 transition-all duration-200",
                                packIndex % 2 === 0 ? "bg-card" : "bg-muted/10"
                              )}>
                              <TableCell 
                                onClick={isAdmin ? () => setEditingBulkSalesPrice({ pack, price: 0 }) : undefined}
                                className={cn(
                                  "font-bold text-xs py-3 px-4 bg-gradient-to-r from-muted/50 to-muted/20 border-r-2 border-border/60 sticky left-0 z-10 transition-all duration-200",
                                  isAdmin ? "cursor-pointer hover:bg-primary/15 hover:shadow-sm group" : "cursor-not-allowed opacity-60"
                                )}
                                title={isAdmin ? `Click to set same price for all suppliers: ${pack}` : 'Only administrators can edit prices'}
                              >
                                <div className="flex items-center gap-2">
                                  <span>{pack}</span>
                                  {isAdmin && (
                                    <Sparkles className="w-3 h-3 text-primary/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  )}
                                </div>
                              </TableCell>
                              {suppliers.length === 0 ? (
                                <TableCell colSpan={1} className="text-center py-8">
                                  <span className="text-xs text-muted-foreground">No suppliers</span>
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
                                        "text-right text-xs py-3 px-4 transition-all duration-200 whitespace-nowrap",
                                        isAdmin ? "cursor-pointer hover:bg-primary/10 hover:shadow-sm" : "cursor-not-allowed opacity-60",
                                        hasPrice && "font-semibold"
                                      )}
                                      title={isAdmin ? `Click to edit: ${pack} - ${supplier}` : 'Only administrators can edit prices'}
                                    >
                                      {hasPrice ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary font-bold">
                                          ${price.sales_price.toFixed(2)}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground/50 text-xs font-medium">—</span>
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

                {/* Purchase Prices Section - Premium Design */}
                <div className="bg-gradient-to-br from-card to-card/95 border border-border/60 rounded-xl shadow-lg overflow-hidden">
                  {/* Enhanced Header */}
                  <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-accent/10 via-accent/5 to-transparent border-b border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center">
                        <ShoppingCart className="w-4 h-4 text-accent" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
                          Purchase Prices
                          {!isAdmin && (
                            <Lock className="w-3.5 h-3.5 text-muted-foreground" title="Read-only: Admin only" />
                          )}
                        </h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          USD per carton • Varies by pack & supplier {isAdmin && '• Click pack name to bulk edit'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/5 border border-accent/20 rounded-lg">
                      <TrendingUp className="w-3.5 h-3.5 text-accent" />
                      <span className="text-[10px] font-semibold text-accent uppercase tracking-wide">
                        Cost
                      </span>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40 border-b-2 border-border h-10">
                          <TableHead className="w-36 text-xs font-bold py-3 px-4 bg-gradient-to-r from-muted/80 to-muted/40 sticky left-0 z-20 border-r-2 border-border/60 shadow-sm">
                            <div className="flex items-center gap-2">
                              <Package className="w-3.5 h-3.5 text-accent" />
                              <span>Pack</span>
                            </div>
                          </TableHead>
                          {suppliers.length === 0 ? (
                            <TableHead className="text-center text-xs py-3 px-4">
                              <span className="text-muted-foreground font-medium">No suppliers available</span>
                            </TableHead>
                          ) : (
                            suppliers.map(supplier => (
                              <TableHead key={supplier} className="text-right text-xs font-bold min-w-[110px] py-3 px-4 whitespace-nowrap bg-muted/20">
                                <div className="truncate font-semibold" title={supplier}>{supplier}</div>
                              </TableHead>
                            ))
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {packs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={suppliers.length + 1} className="text-center py-12">
                              <div className="flex flex-col items-center gap-2">
                                <Package className="w-8 h-8 text-muted-foreground/40" />
                                <p className="text-sm font-medium text-muted-foreground">No packs available</p>
                                <p className="text-xs text-muted-foreground/70">No shipping data found for this year and fruit combination</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          packs.map((pack, packIndex) => (
                            <TableRow key={pack} className={cn(
                              "hover:bg-accent/3 border-b border-border/40 transition-all duration-200",
                              packIndex % 2 === 0 ? "bg-card" : "bg-muted/10"
                            )}>
                              <TableCell 
                                onClick={isAdmin ? () => setEditingBulkPurchasePrice({ pack, price: 0 }) : undefined}
                                className={cn(
                                  "font-bold text-xs py-3 px-4 bg-gradient-to-r from-muted/50 to-muted/20 border-r-2 border-border/60 sticky left-0 z-10 transition-all duration-200",
                                  isAdmin ? "cursor-pointer hover:bg-accent/15 hover:shadow-sm group" : "cursor-not-allowed opacity-60"
                                )}
                                title={isAdmin ? `Click to set same price for all suppliers: ${pack}` : 'Only administrators can edit prices'}
                              >
                                <div className="flex items-center gap-2">
                                  <span>{pack}</span>
                                  {isAdmin && (
                                    <Sparkles className="w-3 h-3 text-accent/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  )}
                                </div>
                              </TableCell>
                              {suppliers.length === 0 ? (
                                <TableCell colSpan={1} className="text-center py-8">
                                  <span className="text-xs text-muted-foreground">No suppliers</span>
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
                                        "text-right text-xs py-3 px-4 transition-all duration-200 whitespace-nowrap",
                                        isAdmin ? "cursor-pointer hover:bg-accent/10 hover:shadow-sm" : "cursor-not-allowed opacity-60",
                                        hasPrice && "font-semibold"
                                      )}
                                      title={isAdmin ? `Click to edit: ${pack} - ${supplier}` : 'Only administrators can edit prices'}
                                    >
                                      {hasPrice ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-accent/10 text-accent font-bold">
                                          ${price.purchase_price.toFixed(2)}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground/50 text-xs font-medium">—</span>
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

      {/* Edit Sales Price Dialog - Premium Design */}
      {editingSalesPrice && (
        <Dialog open={!!editingSalesPrice} onOpenChange={() => setEditingSalesPrice(null)}>
          <DialogContent className="max-w-md p-0 gap-0">
            <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent border-b border-border/50">
              <DialogTitle className="flex items-center gap-3 text-xl font-heading font-bold">
                <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span>Edit Sales Price</span>
                    {!isAdmin && (
                      <span className="text-xs text-muted-foreground font-normal flex items-center gap-1 px-2 py-0.5 bg-muted/60 rounded-md">
                        <Lock className="w-3 h-3" />
                        Read-only
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 font-normal">Update price for specific pack and supplier</p>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 px-6 py-5">
              <div className="bg-gradient-to-br from-muted/50 to-muted/30 p-4 rounded-xl border border-border/60">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Fruit</p>
                    <p className="text-sm font-bold text-foreground">{filterFruit}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Year</p>
                    <p className="text-sm font-bold text-foreground">{filterYear}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Pack</p>
                    <p className="text-sm font-bold text-foreground">{editingSalesPrice.pack}</p>
                  </div>
                  {editingSalesPrice.supplier && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Supplier</p>
                      <p className="text-sm font-bold text-foreground">{editingSalesPrice.supplier}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="sales-price" className="text-sm font-bold uppercase tracking-wide text-foreground flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  Sales Price (USD per carton)
                </Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground font-bold text-lg">$</span>
                  <Input
                    id="sales-price"
                    type="number"
                    step="0.01"
                    value={editingSalesPrice.price}
                    onChange={(e) => setEditingSalesPrice({
                      ...editingSalesPrice,
                      price: parseFloat(e.target.value) || 0
                    })}
                    className="pl-10 h-12 text-lg font-bold border-2 focus:border-primary"
                    placeholder="0.00"
                    disabled={!isAdmin}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  This price applies to all cartons of {editingSalesPrice.pack} from {editingSalesPrice.supplier || 'all suppliers'}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-border/50">
                <Button variant="outline" onClick={() => setEditingSalesPrice(null)} size="sm">
                  Cancel
                </Button>
                <Button onClick={handleSaveSalesPrice} disabled={isSaving || !isAdmin} size="sm" className="bg-primary hover:bg-primary/90">
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Price'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Purchase Price Dialog - Premium Design */}
      {editingPurchasePrice && (
        <Dialog open={!!editingPurchasePrice} onOpenChange={() => setEditingPurchasePrice(null)}>
          <DialogContent className="max-w-md p-0 gap-0">
            <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-br from-accent/5 via-accent/3 to-transparent border-b border-border/50">
              <DialogTitle className="flex items-center gap-3 text-xl font-heading font-bold">
                <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span>Edit Purchase Price</span>
                    {!isAdmin && (
                      <span className="text-xs text-muted-foreground font-normal flex items-center gap-1 px-2 py-0.5 bg-muted/60 rounded-md">
                        <Lock className="w-3 h-3" />
                        Read-only
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 font-normal">Update cost for specific pack and supplier</p>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 px-6 py-5">
              <div className="bg-gradient-to-br from-muted/50 to-muted/30 p-4 rounded-xl border border-border/60">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Fruit</p>
                    <p className="text-sm font-bold text-foreground">{filterFruit}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Year</p>
                    <p className="text-sm font-bold text-foreground">{filterYear}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Pack</p>
                    <p className="text-sm font-bold text-foreground">{editingPurchasePrice.pack}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Supplier</p>
                    <p className="text-sm font-bold text-foreground">{editingPurchasePrice.supplier}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="purchase-price" className="text-sm font-bold uppercase tracking-wide text-foreground flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-accent" />
                  Purchase Price (USD per carton)
                </Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground font-bold text-lg">$</span>
                  <Input
                    id="purchase-price"
                    type="number"
                    step="0.01"
                    value={editingPurchasePrice.price}
                    onChange={(e) => setEditingPurchasePrice({
                      ...editingPurchasePrice,
                      price: parseFloat(e.target.value) || 0
                    })}
                    className="pl-10 h-12 text-lg font-bold border-2 focus:border-accent"
                    placeholder="0.00"
                    disabled={!isAdmin}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  This price applies to all cartons of {editingPurchasePrice.pack} from {editingPurchasePrice.supplier}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-border/50">
                <Button variant="outline" onClick={() => setEditingPurchasePrice(null)} size="sm">
                  Cancel
                </Button>
                <Button onClick={handleSavePurchasePrice} disabled={isSaving || !isAdmin} size="sm" className="bg-accent hover:bg-accent/90">
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Price'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk Edit Sales Price Dialog - Premium Design */}
      {editingBulkSalesPrice && (
        <Dialog open={!!editingBulkSalesPrice} onOpenChange={() => setEditingBulkSalesPrice(null)}>
          <DialogContent className="max-w-md p-0 gap-0">
            <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent border-b border-border/50">
              <DialogTitle className="flex items-center gap-3 text-xl font-heading font-bold">
                <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span>Bulk Set Sales Price</span>
                    {!isAdmin && (
                      <span className="text-xs text-muted-foreground font-normal flex items-center gap-1 px-2 py-0.5 bg-muted/60 rounded-md">
                        <Lock className="w-3 h-3" />
                        Read-only
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 font-normal">Apply same price to all suppliers</p>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 px-6 py-5">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-4 rounded-xl border-2 border-primary/20">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Fruit</p>
                    <p className="text-sm font-bold text-foreground">{filterFruit}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Year</p>
                    <p className="text-sm font-bold text-foreground">{filterYear}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Pack</p>
                    <p className="text-sm font-bold text-foreground">{editingBulkSalesPrice.pack}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Suppliers</p>
                    <p className="text-sm font-bold text-primary">{suppliers.length}</p>
                  </div>
                </div>
                <div className="pt-3 border-t border-primary/20">
                  <p className="text-xs font-medium text-primary/90 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    This price will be applied to ALL {suppliers.length} suppliers for pack {editingBulkSalesPrice.pack}
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="bulk-sales-price" className="text-sm font-bold uppercase tracking-wide text-foreground flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  Sales Price (USD per carton)
                </Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground font-bold text-lg">$</span>
                  <Input
                    id="bulk-sales-price"
                    type="number"
                    step="0.01"
                    value={editingBulkSalesPrice.price}
                    onChange={(e) => setEditingBulkSalesPrice({
                      ...editingBulkSalesPrice,
                      price: parseFloat(e.target.value) || 0
                    })}
                    className="pl-10 h-12 text-lg font-bold border-2 focus:border-primary"
                    placeholder="0.00"
                    autoFocus
                    disabled={!isAdmin}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-border/50">
                <Button variant="outline" onClick={() => setEditingBulkSalesPrice(null)} size="sm">
                  Cancel
                </Button>
                <Button onClick={handleSaveBulkSalesPrice} disabled={isSaving || !isAdmin} size="sm" className="bg-primary hover:bg-primary/90">
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Set for {suppliers.length} Suppliers
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk Edit Purchase Price Dialog - Premium Design */}
      {editingBulkPurchasePrice && (
        <Dialog open={!!editingBulkPurchasePrice} onOpenChange={() => setEditingBulkPurchasePrice(null)}>
          <DialogContent className="max-w-md p-0 gap-0">
            <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-br from-accent/5 via-accent/3 to-transparent border-b border-border/50">
              <DialogTitle className="flex items-center gap-3 text-xl font-heading font-bold">
                <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span>Bulk Set Purchase Price</span>
                    {!isAdmin && (
                      <span className="text-xs text-muted-foreground font-normal flex items-center gap-1 px-2 py-0.5 bg-muted/60 rounded-md">
                        <Lock className="w-3 h-3" />
                        Read-only
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 font-normal">Apply same cost to all suppliers</p>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 px-6 py-5">
              <div className="bg-gradient-to-br from-accent/10 to-accent/5 p-4 rounded-xl border-2 border-accent/20">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Fruit</p>
                    <p className="text-sm font-bold text-foreground">{filterFruit}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Year</p>
                    <p className="text-sm font-bold text-foreground">{filterYear}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Pack</p>
                    <p className="text-sm font-bold text-foreground">{editingBulkPurchasePrice.pack}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Suppliers</p>
                    <p className="text-sm font-bold text-accent">{suppliers.length}</p>
                  </div>
                </div>
                <div className="pt-3 border-t border-accent/20">
                  <p className="text-xs font-medium text-accent/90 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    This price will be applied to ALL {suppliers.length} suppliers for pack {editingBulkPurchasePrice.pack}
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="bulk-purchase-price" className="text-sm font-bold uppercase tracking-wide text-foreground flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-accent" />
                  Purchase Price (USD per carton)
                </Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground font-bold text-lg">$</span>
                  <Input
                    id="bulk-purchase-price"
                    type="number"
                    step="0.01"
                    value={editingBulkPurchasePrice.price}
                    onChange={(e) => setEditingBulkPurchasePrice({
                      ...editingBulkPurchasePrice,
                      price: parseFloat(e.target.value) || 0
                    })}
                    className="pl-10 h-12 text-lg font-bold border-2 focus:border-accent"
                    placeholder="0.00"
                    autoFocus
                    disabled={!isAdmin}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-border/50">
                <Button variant="outline" onClick={() => setEditingBulkPurchasePrice(null)} size="sm">
                  Cancel
                </Button>
                <Button onClick={handleSaveBulkPurchasePrice} disabled={isSaving || !isAdmin} size="sm" className="bg-accent hover:bg-accent/90">
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Set for {suppliers.length} Suppliers
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

