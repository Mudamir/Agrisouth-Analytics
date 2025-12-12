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

  // Get unique years from data for selected fruit type
  const years = useMemo(() => {
    const fruitData = data.filter(r => r.item === selectedFruit);
    const uniqueYears = Array.from(new Set(fruitData.map(r => r.year))).sort((a, b) => b - a);
    return uniqueYears;
  }, [data, selectedFruit]);

  // Fetch price configuration from Supabase
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        if (!supabase) return;

        // Determine which year to use for price filtering
        // If selectedYear is 'ALL', we need to get prices for the most recent year in the data
        // Otherwise, use the selectedYear
        let priceYear: number | null = null;
        if (selectedYear !== 'ALL') {
          priceYear = selectedYear;
        } else {
          // Get unique years from data for this fruit
          const fruitData = data.filter(r => r.item === selectedFruit);
          const uniqueYears = Array.from(new Set(fruitData.map(r => r.year))).sort((a, b) => b - a);
          if (uniqueYears.length > 0) {
            // Use the most recent year when 'ALL' is selected
            priceYear = uniqueYears[0];
          }
        }

        // Build sales prices query - filter by item and year
        let salesQuery = supabase
          .from('sales_prices')
          .select('*')
          .eq('item', selectedFruit);
        
        if (priceYear !== null) {
          salesQuery = salesQuery.eq('year', priceYear);
        }

        const { data: salesData, error: salesError } = await salesQuery;

        if (salesError) {
          console.error('Error fetching sales prices:', salesError);
        }

        // Build purchase prices query - filter by item and year
        let purchaseQuery = supabase
          .from('purchase_prices')
          .select('*')
          .eq('item', selectedFruit);
        
        if (priceYear !== null) {
          purchaseQuery = purchaseQuery.eq('year', priceYear);
        }

        const { data: purchaseData, error: purchaseError } = await purchaseQuery;

        if (purchaseError) {
          console.error('Error fetching purchase prices:', purchaseError);
        }

        // Filter prices to only include those matching the selected year
        // This ensures we only use prices for the year being displayed
        const filteredSalesData = priceYear !== null 
          ? salesData?.filter(sp => sp.year === priceYear) || []
          : salesData || [];
        
        const filteredPurchaseData = priceYear !== null
          ? purchaseData?.filter(pp => pp.year === priceYear) || []
          : purchaseData || [];

        // Create maps for quick lookup
        // Sales prices: Handle both models
        // - BANANAS: pack -> price (supplier IS NULL)
        // - PINEAPPLES: "pack|supplier" -> price (supplier-specific)
        const newSalesPriceMap = new Map<string, number>();
        const salesPricesByPackSupplier = new Map<string, number>();
        
        filteredSalesData.forEach(sp => {
          // Only process prices that match the selected year (or all if year is null)
          if (priceYear === null || sp.year === priceYear) {
            if (sp.supplier == null || sp.supplier === '') {
              // Uniform pricing (BANANAS) - use pack as key
              newSalesPriceMap.set(sp.pack, sp.sales_price);
            } else {
              // Supplier-specific pricing (PINEAPPLES) - use "pack|supplier" as key
              const key = `${sp.pack}|${sp.supplier}`;
              salesPricesByPackSupplier.set(key, sp.sales_price);
            }
          }
        });

        // Purchase prices: "pack|supplier" -> price
        const newPurchasePriceMap = new Map<string, number>();
        filteredPurchaseData.forEach(pp => {
          // Only process prices that match the selected year (or all if year is null)
          if (priceYear === null || pp.year === priceYear) {
            const key = `${pp.pack}|${pp.supplier}`;
            newPurchasePriceMap.set(key, pp.purchase_price);
          }
        });

        // Store the maps for direct access
        setSalesPriceMap(newSalesPriceMap);
        setSalesPricesByPackSupplier(salesPricesByPackSupplier);
        setPurchasePriceMap(newPurchasePriceMap);

        // Combine into a single map structure for backward compatibility
        // Format: "pack|supplier" -> { sales, purchase }
        const combinedMap = new Map<string, { sales: number; purchase: number }>();
        
        // For each pack, create entries for all suppliers with sales price
        // Use filtered data to ensure we only work with prices for the selected year
        const allPacks = new Set<string>();
        filteredSalesData.forEach(sp => allPacks.add(sp.pack));
        filteredPurchaseData.forEach(pp => allPacks.add(pp.pack));
        
        allPacks.forEach(pack => {
          // Get all suppliers for this pack (from filtered data)
          const suppliersForPack = new Set<string>();
          filteredPurchaseData.forEach(pp => {
            if (pp.pack === pack) suppliersForPack.add(pp.supplier);
          });
          filteredSalesData.forEach(sp => {
            if (sp.pack === pack && sp.supplier) suppliersForPack.add(sp.supplier);
          });
          
          // If no suppliers found, create a generic entry
          if (suppliersForPack.size === 0) {
            const uniformSalesPrice = newSalesPriceMap.get(pack) || 0;
            combinedMap.set(`${pack}|*`, { sales: uniformSalesPrice, purchase: 0 });
          } else {
            suppliersForPack.forEach(supplier => {
              // Try supplier-specific sales price first, fall back to uniform price
              const salesPrice = salesPricesByPackSupplier.get(`${pack}|${supplier}`) 
                               || newSalesPriceMap.get(pack) 
                               || 0;
              const purchasePrice = newPurchasePriceMap.get(`${pack}|${supplier}`) || 0;
              combinedMap.set(`${pack}|${supplier}`, { sales: salesPrice, purchase: purchasePrice });
            });
          }
        });

        setPriceConfig(combinedMap);
      } catch (error) {
        console.error('Error loading prices:', error);
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

  // Calculate PNL data grouped by pack and supplier
  const pnlData = useMemo(() => {
    const packMap = new Map<string, Map<string, { cartons: number; sales: number; purchase: number }>>();

    filteredData.forEach(record => {
      const pack = record.pack;
      const supplier = record.supplier;
      const purchaseKey = `${pack}|${supplier}`;
      const salesKey = `${pack}|${supplier}`;
      
      // Get sales price - try supplier-specific first (PINEAPPLES), then uniform (BANANAS), then fallback to record price
      const salesPrice = salesPricesByPackSupplier.get(salesKey) 
                      || salesPriceMap.get(pack) 
                      || record.price;
      
      // Get purchase price directly from purchase_prices table (varies by supplier)
      const purchasePrice = purchasePriceMap.get(purchaseKey) || (salesPrice * 0.9); // Fallback to 90% if no config
      
      // Calculate sales = cartons * configured sales price
      const sales = record.cartons * salesPrice;
      
      // Calculate purchase = cartons * purchase_price
      const purchase = record.cartons * purchasePrice;
      
      if (!packMap.has(pack)) {
        packMap.set(pack, new Map());
      }
      
      const supplierMap = packMap.get(pack)!;
      if (!supplierMap.has(supplier)) {
        supplierMap.set(supplier, { cartons: 0, sales: 0, purchase: 0 });
      }
      
      const supplierData = supplierMap.get(supplier)!;
      supplierData.cartons += record.cartons;
      supplierData.sales += sales;
      supplierData.purchase += purchase;
    });

    // Convert to structured format
    const result: PackData[] = [];
    const allSuppliers = new Set<string>();
    
    packMap.forEach((supplierMap, pack) => {
      const packData: PackData = {
        pack,
        suppliers: {},
        totals: { cartons: 0, sales: 0, purchase: 0, profit: 0 }
      };
      
      supplierMap.forEach((data, supplier) => {
        allSuppliers.add(supplier);
        // Profit = Sales - Purchase
        const profit = data.sales - data.purchase;
        packData.suppliers[supplier] = {
          ...data,
          profit
        };
        packData.totals.cartons += data.cartons;
        packData.totals.sales += data.sales;
        packData.totals.purchase += data.purchase;
        packData.totals.profit += profit;
      });
      
      result.push(packData);
    });

    // Sort packs
    result.sort((a, b) => a.pack.localeCompare(b.pack));

      return { packs: result, suppliers: Array.from(allSuppliers).sort() };
  }, [filteredData, salesPriceMap, purchasePriceMap]);

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
            <p className="text-sm text-muted-foreground">Financial overview by pack and supplier</p>
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
        />
        <StatCard
          label="Total Sales"
          value={formatCurrency(grandTotals.sales)}
          variant="large"
        />
        <StatCard
          label="Total Purchase"
          value={formatCurrency(grandTotals.purchase)}
          variant="large"
        />
        <div 
          className={cn(
            "stat-card",
            grandTotals.profit >= 0 
              ? "border-green-500/30" 
              : "border-red-500/30"
          )}
        >
          <p className="stat-card-label">Net Profit</p>
          <p 
            className="stat-card-value text-3xl md:text-4xl"
            style={{ 
              color: grandTotals.profit >= 0 ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)'
            }}
          >
            {formatCurrency(grandTotals.profit)}
          </p>
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

