import { useState, useMemo, useEffect } from 'react';
import { ShippingRecord, FruitType } from '@/types/shipping';
import { supabase } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { CartonsSection } from './pnl/CartonsSection';
import { SalesSection } from './pnl/SalesSection';
import { PurchaseSection } from './pnl/PurchaseSection';
import { ProfitSection } from './pnl/ProfitSection';
import { PriceManagement } from './pnl/PriceManagement';
import { StatCard } from './StatCard';
import { cn } from '@/lib/utils';

interface PNLViewProps {
  data: ShippingRecord[];
  selectedFruit: FruitType;
  onSelectFruit: (fruit: FruitType) => void;
}

export interface SupplierData {
  cartons: number;
  sales: number;
  purchase: number;
  profit: number;
}

export interface PackData {
  pack: string;
  suppliers: {
    [supplier: string]: SupplierData;
  };
  totals: SupplierData;
}

export function PNLView({ data, selectedFruit, onSelectFruit }: PNLViewProps) {
  const [selectedYear, setSelectedYear] = useState<number | 'ALL'>('ALL');
  const [priceConfig, setPriceConfig] = useState<Map<string, { sales: number; purchase: number }>>(new Map());
  const [salesPriceMap, setSalesPriceMap] = useState<Map<string, number>>(new Map()); // Direct access to uniform sales prices by pack (BANANAS)
  const [salesPricesByPackSupplier, setSalesPricesByPackSupplier] = useState<Map<string, number>>(new Map()); // Direct access to supplier-specific sales prices by "pack|supplier" (PINEAPPLES)
  const [purchasePriceMap, setPurchasePriceMap] = useState<Map<string, number>>(new Map()); // Direct access to purchase prices by "pack|supplier"
  const [priceKey, setPriceKey] = useState(0); // Force refresh when prices update
  const [selectedCell, setSelectedCell] = useState<{ pack: string; supplier: string } | null>(null);
  const [isLoadingPrices, setIsLoadingPrices] = useState(true); // Track when prices are loading
  const [dataReady, setDataReady] = useState(false); // Track when data is ready after delay
  const [loadingProgress, setLoadingProgress] = useState(0); // Track loading progress

  // Get unique years from data for selected fruit type
  const years = useMemo(() => {
    const fruitData = data.filter(r => r.item === selectedFruit);
    const uniqueYears = Array.from(new Set(fruitData.map(r => r.year))).sort((a, b) => b - a);
    return uniqueYears;
  }, [data, selectedFruit]);

  // Clear loading state when year/fruit changes
  useEffect(() => {
    setIsLoadingPrices(true);
    setDataReady(false);
    setLoadingProgress(0);
  }, [selectedFruit, selectedYear]);

  // Fetch price configuration from Supabase
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        if (!supabase) {
          setIsLoadingPrices(false);
          setLoadingProgress(100);
          // Still wait 1 second before showing data
          setTimeout(() => setDataReady(true), 1000);
          return;
        }
        
        setIsLoadingPrices(true);

        // When 'ALL' is selected, fetch prices for all years
        // Otherwise, fetch prices only for the selected year
        const fruitData = data.filter(r => r.item === selectedFruit);
        const uniqueYears = Array.from(new Set(fruitData.map(r => r.year))).sort((a, b) => b - a);
        
        // Build sales prices query - filter by item
        let salesQuery = supabase
          .from('sales_prices')
          .select('*')
          .eq('item', selectedFruit);
        
        // If not 'ALL', filter by specific year
        if (selectedYear !== 'ALL') {
          salesQuery = salesQuery.eq('year', selectedYear);
        } else {
          // When 'ALL', get prices for all years that exist in the data
          if (uniqueYears.length > 0) {
            salesQuery = salesQuery.in('year', uniqueYears);
          }
        }

        const { data: salesData, error: salesError } = await salesQuery;

        if (salesError) {
          console.error('Error fetching sales prices:', salesError);
        }

        // Build purchase prices query - filter by item
        let purchaseQuery = supabase
          .from('purchase_prices')
          .select('*')
          .eq('item', selectedFruit);
        
        // If not 'ALL', filter by specific year
        if (selectedYear !== 'ALL') {
          purchaseQuery = purchaseQuery.eq('year', selectedYear);
        } else {
          // When 'ALL', get prices for all years that exist in the data
          if (uniqueYears.length > 0) {
            purchaseQuery = purchaseQuery.in('year', uniqueYears);
          }
        }

        const { data: purchaseData, error: purchaseError } = await purchaseQuery;

        if (purchaseError) {
          console.error('Error fetching purchase prices:', purchaseError);
        }

        // Create maps for quick lookup with year information
        // When 'ALL' is selected, we need to store prices by year: "pack|supplier|year" or "pack|year"
        // Sales prices: Handle both models
        // - BANANAS: "pack|year" -> price (supplier IS NULL)
        // - PINEAPPLES: "pack|supplier|year" -> price (supplier-specific)
        const newSalesPriceMap = new Map<string, number>(); // "pack|year" -> price
        const salesPricesByPackSupplier = new Map<string, number>(); // "pack|supplier|year" -> price
        
        (salesData || []).forEach(sp => {
          if (sp.supplier == null || sp.supplier === '') {
            // Uniform pricing (BANANAS) - use "pack|year" as key
            const key = `${sp.pack}|${sp.year}`;
            newSalesPriceMap.set(key, sp.sales_price);
          } else {
            // Supplier-specific pricing (PINEAPPLES) - use "pack|supplier|year" as key
            const key = `${sp.pack}|${sp.supplier}|${sp.year}`;
            salesPricesByPackSupplier.set(key, sp.sales_price);
          }
        });

        // Purchase prices: "pack|supplier|year" -> price
        const newPurchasePriceMap = new Map<string, number>();
        (purchaseData || []).forEach(pp => {
          const key = `${pp.pack}|${pp.supplier}|${pp.year}`;
          newPurchasePriceMap.set(key, pp.purchase_price);
        });

        // Store the maps for direct access
        setSalesPriceMap(newSalesPriceMap);
        setSalesPricesByPackSupplier(salesPricesByPackSupplier);
        setPurchasePriceMap(newPurchasePriceMap);

        // Combine into a single map structure for backward compatibility
        // Format: "pack|supplier" -> { sales, purchase } (for single year view)
        // For 'ALL' years, this map won't be used directly, but we keep it for compatibility
        const combinedMap = new Map<string, { sales: number; purchase: number }>();
        
        if (selectedYear !== 'ALL') {
          // For single year view, create the combined map as before
          const allPacks = new Set<string>();
          (salesData || []).forEach(sp => {
            if (sp.year === selectedYear) allPacks.add(sp.pack);
          });
          (purchaseData || []).forEach(pp => {
            if (pp.year === selectedYear) allPacks.add(pp.pack);
          });
          
          allPacks.forEach(pack => {
            const suppliersForPack = new Set<string>();
            (purchaseData || []).forEach(pp => {
              if (pp.pack === pack && pp.year === selectedYear) suppliersForPack.add(pp.supplier);
            });
            (salesData || []).forEach(sp => {
              if (sp.pack === pack && sp.supplier && sp.year === selectedYear) suppliersForPack.add(sp.supplier);
            });
            
            if (suppliersForPack.size === 0) {
              const uniformSalesPrice = newSalesPriceMap.get(`${pack}|${selectedYear}`) || 0;
              combinedMap.set(`${pack}|*`, { sales: uniformSalesPrice, purchase: 0 });
            } else {
              suppliersForPack.forEach(supplier => {
                const salesPrice = salesPricesByPackSupplier.get(`${pack}|${supplier}|${selectedYear}`) 
                                 || newSalesPriceMap.get(`${pack}|${selectedYear}`) 
                                 || 0;
                const purchasePrice = newPurchasePriceMap.get(`${pack}|${supplier}|${selectedYear}`) || 0;
                combinedMap.set(`${pack}|${supplier}`, { sales: salesPrice, purchase: purchasePrice });
              });
            }
          });
        }

        setPriceConfig(combinedMap);
        setIsLoadingPrices(false);
        
        // Simulate progress for better UX
        setLoadingProgress(50);
        
        // Wait 1 second before showing final data to ensure accuracy
        // Show progress during this time
        const progressInterval = setInterval(() => {
          setLoadingProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 100);
        
        const timer = setTimeout(() => {
          setLoadingProgress(100);
          clearInterval(progressInterval);
          setDataReady(true);
        }, 1000);
        
        return () => {
          clearTimeout(timer);
          clearInterval(progressInterval);
        };
      } catch (error) {
        console.error('Error loading prices:', error);
        setIsLoadingPrices(false);
        setLoadingProgress(100);
        // Even on error, wait 1 second before showing data
        const timer = setTimeout(() => {
          setDataReady(true);
        }, 1000);
        
        return () => clearTimeout(timer);
      }
    };

    fetchPrices();
  }, [selectedFruit, selectedYear, priceKey, data]);

  // Filter data by fruit type and year
  const filteredData = useMemo(() => {
    let filtered = data.filter(r => r.item === selectedFruit);
    if (selectedYear !== 'ALL') {
      filtered = filtered.filter(r => r.year === selectedYear);
    }
    return filtered;
  }, [data, selectedFruit, selectedYear]);

  // Get unique packs and suppliers from filtered data (for price management)
  const uniquePacks = useMemo(() => {
    const packSet = new Set<string>();
    filteredData.forEach(r => packSet.add(r.pack));
    return Array.from(packSet).sort();
  }, [filteredData]);

  const uniqueSuppliers = useMemo(() => {
    const supplierSet = new Set<string>();
    filteredData.forEach(r => supplierSet.add(r.supplier));
    return Array.from(supplierSet).sort();
  }, [filteredData]);

  // Calculate PNL data grouped by pack and supplier - OPTIMIZED VERSION
  // Performance optimizations:
  // 1. Price lookup caching: Avoids redundant map lookups for records with same (pack, supplier, year)
  // 2. Single-pass aggregation: Builds result structure in one iteration (O(n) instead of O(n) + O(m))
  // 3. Flat map structure: Uses composite keys for O(1) lookups instead of nested maps
  // 4. Early aggregation: Calculates totals as we iterate, avoiding separate aggregation pass
  const pnlData = useMemo(() => {
    // Price lookup cache - scoped to this calculation
    // Most records share the same (pack, supplier, year), so caching significantly reduces lookups
    const priceCache = new Map<string, { sales: number; purchase: number }>();
    
    // Inline price lookup function with caching
    // Returns cached result if available, otherwise computes and caches
    const getPrices = (pack: string, supplier: string, year: number, fallbackSalesPrice: number) => {
      const cacheKey = `${pack}|${supplier}|${year}`;
      
      // Check cache first (most records will hit cache)
      if (priceCache.has(cacheKey)) {
        return priceCache.get(cacheKey)!;
      }
      
      // Build lookup keys once
      const salesKeySupplier = `${pack}|${supplier}|${year}`;
      const salesKeyUniform = `${pack}|${year}`;
      const purchaseKey = `${pack}|${supplier}|${year}`;
      
      // Get sales price - try supplier-specific first (PINEAPPLES), then uniform (BANANAS), then fallback
      const salesPrice = salesPricesByPackSupplier.get(salesKeySupplier) 
                      || salesPriceMap.get(salesKeyUniform) 
                      || fallbackSalesPrice;
      
      // Get purchase price directly from purchase_prices table (varies by supplier and year)
      const purchasePrice = purchasePriceMap.get(purchaseKey) || (salesPrice * 0.9);
      
      const result = { sales: salesPrice, purchase: purchasePrice };
      priceCache.set(cacheKey, result);
      return result;
    };

    // Use a flat map with composite key for O(1) lookups: "pack|supplier"
    const supplierDataMap = new Map<string, { cartons: number; sales: number; purchase: number }>();
    const allSuppliers = new Set<string>();

    // Single pass: aggregate as we iterate (O(n) complexity)
    for (const record of filteredData) {
      const { pack, supplier, year, cartons, price: fallbackPrice } = record;
      
      // Get prices (cached lookup - O(1) after first lookup)
      const { sales: salesPrice, purchase: purchasePrice } = getPrices(pack, supplier, year, fallbackPrice);
      
      // Calculate values
      const sales = cartons * salesPrice;
      const purchase = cartons * purchasePrice;
      
      // Aggregate using composite key (O(1) lookup)
      const key = `${pack}|${supplier}`;
      const existing = supplierDataMap.get(key);
      
      if (existing) {
        existing.cartons += cartons;
        existing.sales += sales;
        existing.purchase += purchase;
      } else {
        supplierDataMap.set(key, { cartons, sales, purchase });
        allSuppliers.add(supplier);
      }
    }

    // Build result structure in single pass
    const packDataMap = new Map<string, PackData>();
    
    for (const [key, data] of supplierDataMap) {
      const [pack, supplier] = key.split('|');
      const profit = data.sales - data.purchase;
      
      if (!packDataMap.has(pack)) {
        packDataMap.set(pack, {
          pack,
          suppliers: {},
          totals: { cartons: 0, sales: 0, purchase: 0, profit: 0 }
        });
      }
      
      const packData = packDataMap.get(pack)!;
      packData.suppliers[supplier] = { ...data, profit };
      packData.totals.cartons += data.cartons;
      packData.totals.sales += data.sales;
      packData.totals.purchase += data.purchase;
      packData.totals.profit += profit;
    }

    // Convert to array and sort
    const result = Array.from(packDataMap.values()).sort((a, b) => a.pack.localeCompare(b.pack));

    return { packs: result, suppliers: Array.from(allSuppliers).sort() };
  }, [filteredData, salesPriceMap, salesPricesByPackSupplier, purchasePriceMap]);

  // Calculate grand totals
  const grandTotals = useMemo(() => {
    return pnlData.packs.reduce(
      (acc, pack) => ({
        cartons: acc.cartons + pack.totals.cartons,
        sales: acc.sales + pack.totals.sales,
        purchase: acc.purchase + pack.totals.purchase,
        profit: acc.profit + pack.totals.profit,
      }),
      { cartons: 0, sales: 0, purchase: 0, profit: 0 }
    );
  }, [pnlData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="page-title mb-1">PROFIT & LOSS (PNL)</h1>
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                {isLoadingPrices || !dataReady 
                  ? 'Calculating financial data...' 
                  : 'Financial overview by pack and supplier'}
              </p>
              {(isLoadingPrices || !dataReady) && (
                <div className="h-1 w-32 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300 ease-out"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
              )}
            </div>
          </div>
          <PriceManagement 
            selectedFruit={selectedFruit} 
            onPriceUpdate={() => setPriceKey(prev => prev + 1)}
            allPacks={uniquePacks}
            allSuppliers={uniqueSuppliers}
            availableYears={years}
          />
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="fruit-filter" className="text-sm">
              Product:
            </Label>
            <Select
              value={selectedFruit}
              onValueChange={(v) => onSelectFruit(v as FruitType)}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BANANAS">Bananas</SelectItem>
                <SelectItem value="PINEAPPLES">Pineapples</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Label htmlFor="year-filter" className="text-sm">
              Year:
            </Label>
            <Select
              value={selectedYear === 'ALL' ? 'ALL' : selectedYear.toString()}
              onValueChange={(v) => setSelectedYear(v === 'ALL' ? 'ALL' : parseInt(v))}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Years</SelectItem>
                {years.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Total Cartons"
          value={grandTotals.cartons}
          variant="large"
          isLoading={isLoadingPrices || !dataReady}
          delay={0}
        />
        <StatCard
          label="Total Sales"
          value={formatCurrency(grandTotals.sales)}
          variant="large"
          isLoading={isLoadingPrices || !dataReady}
          delay={100}
        />
        <StatCard
          label="Total Purchase"
          value={formatCurrency(grandTotals.purchase)}
          variant="large"
          isLoading={isLoadingPrices || !dataReady}
          delay={200}
        />
        <div 
          className={cn(
            "stat-card transition-all duration-300",
            grandTotals.profit >= 0 
              ? "border-green-500/30" 
              : "border-red-500/30",
            !isLoadingPrices && dataReady && "animate-scale-in"
          )}
          style={{
            animationDelay: '300ms',
            transitionDelay: '300ms'
          }}
        >
          <p className="stat-card-label">Net Profit</p>
          {(isLoadingPrices || !dataReady) ? (
            <div className="relative overflow-hidden rounded-md">
              <div 
                className="h-10 bg-muted rounded"
                style={{
                  width: '180px',
                  background: 'linear-gradient(90deg, hsl(var(--muted)) 0%, hsl(var(--muted) / 0.4) 20%, hsl(var(--muted) / 0.6) 40%, hsl(var(--muted) / 0.4) 60%, hsl(var(--muted)) 80%, hsl(var(--muted)) 100%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s ease-in-out infinite',
                }}
              />
            </div>
          ) : (
            <p 
              className="stat-card-value text-3xl md:text-4xl animate-count-up transition-all duration-500"
              style={{ 
                color: grandTotals.profit >= 0 ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)'
              }}
            >
              {formatCurrency(grandTotals.profit)}
            </p>
          )}
        </div>
      </div>

      {/* Tables Section */}
      <div className="space-y-3">
          <CartonsSection 
            packs={pnlData.packs}
            suppliers={pnlData.suppliers}
            grandTotals={grandTotals}
            selectedCell={selectedCell}
            onCellClick={setSelectedCell}
          />
          
          <SalesSection 
            packs={pnlData.packs}
            suppliers={pnlData.suppliers}
            grandTotals={grandTotals}
            selectedCell={selectedCell}
            onCellClick={setSelectedCell}
          />
          
          <PurchaseSection 
            packs={pnlData.packs}
            suppliers={pnlData.suppliers}
            grandTotals={grandTotals}
            selectedCell={selectedCell}
            onCellClick={setSelectedCell}
          />
          
          <ProfitSection 
            packs={pnlData.packs}
            suppliers={pnlData.suppliers}
            grandTotals={grandTotals}
            selectedCell={selectedCell}
            onCellClick={setSelectedCell}
          />
      </div>
    </div>
  );
}

