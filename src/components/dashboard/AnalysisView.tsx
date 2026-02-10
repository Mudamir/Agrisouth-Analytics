import { useMemo } from 'react';
import { ShippingRecord, FruitType } from '@/types/shipping';
import { SupplierCard } from './SupplierCard';
import { StatCard } from './StatCard';
import { Button } from '@/components/ui/button';
import { Banana } from 'lucide-react';
import { PineappleIcon } from './PineappleIcon';
import { cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface AnalysisViewProps {
  data: ShippingRecord[];
  selectedFruit: FruitType;
  onSelectFruit: (fruit: FruitType) => void;
}

export function AnalysisView({ data, selectedFruit, onSelectFruit }: AnalysisViewProps) {
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

  // Helper function to get sort order for a pack
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
    
    // Banana pack sorting - Order: 13.5 KG A, 13.5 KG B, 13.5 KG SH, 3KG, 7KG, 18KG
    // 1. 13.5 KG A (exact match or contains 13.5 and A, but not B or SH)
    if (packUpper === '13.5 KG A' || packUpper === '13 KG A' || 
        (packUpper.includes('13.5') && packUpper.includes('A') && !packUpper.includes('B') && !packUpper.includes('SH')) ||
        (packUpper.includes('13') && packUpper.includes('KG') && packUpper.includes('A') && !packUpper.includes('B') && !packUpper.includes('SH'))) {
      return 1;
    }
    // 2. 13.5 KG B
    if (packUpper === '13.5 KG B' || packUpper === '13KG B' || packUpper === '13 KG B' ||
        (packUpper.includes('13.5') && packUpper.includes('B')) ||
        (packUpper.includes('13') && packUpper.includes('KG') && packUpper.includes('B'))) {
      return 2;
    }
    // 3. 13.5 KG SH
    if (packUpper === '13.5 KG SH' || packUpper === '13KG SH' || packUpper === '13 KG SH' ||
        (packUpper.includes('13.5') && (packUpper.includes('SH') || packUpper.includes('S/H'))) ||
        (packUpper.includes('13') && packUpper.includes('KG') && (packUpper.includes('SH') || packUpper.includes('S/H')))) {
      return 3;
    }
    // 4. 3KG or 3 KG A (matches "3KG" exactly or starts with "3" and has KG, but not part of 13.5)
    if (packUpper === '3KG' || packUpper === '3 KG A' || 
        (packUpper.match(/^3\s*KG/i) && !packUpper.includes('13.5') && !packUpper.includes('13 KG'))) {
      return 4;
    }
    // 4.5. 6KG (between 3KG and 7KG)
    if (packUpper === '6KG' || (packUpper.match(/^6\s*KG/i) && !packUpper.includes('13.5') && !packUpper.includes('16') && !packUpper.includes('26'))) {
      return 4.5;
    }
    // 5. 7KG or 7.2 KG A (matches "7KG" exactly or starts with "7" and has KG, but not part of 13.5, 17, 27)
    if (packUpper === '7KG' || packUpper === '7.2 KG A' || 
        (packUpper.match(/^7\s*KG/i) || packUpper.match(/^7\.2\s*KG/i)) && !packUpper.includes('13.5') && !packUpper.includes('17') && !packUpper.includes('27')) {
      return 5;
    }
    // 6. 18KG or 18 KG A
    if (packUpper === '18KG' || packUpper === '18 KG A' || packUpper.includes('18 KG')) {
      return 6;
    }
    // Any other packs go to the end
    return 999;
  };

  // Helper function to sort packs
  const sortPacks = (a: { pack: string; cartons: number; containers: number }, b: { pack: string; cartons: number; containers: number }) => {
    const orderA = getPackSortOrder(a.pack);
    const orderB = getPackSortOrder(b.pack);
    
    // First sort by custom order
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    
    // If same order, sort by pack name alphabetically
    return a.pack.localeCompare(b.pack);
  };

  // Data is already filtered by FilterPanel and selectedFruit from useShippingData
  // Calculate supplier statistics with pack breakdown
  const supplierStats = useMemo(() => {
    const supplierMap = new Map<string, {
      cartons: number;
      containers: number;
      packs: Map<string, { cartons: number; containers: number }>;
    }>();

    data.forEach(r => {
      const existing = supplierMap.get(r.supplier) || {
        cartons: 0,
        containers: 0,
        packs: new Map(),
      };

      // For supplier total, use lCont (load count) directly from the data
      existing.cartons += r.cartons;
      existing.containers += r.lCont;

      // For pack breakdown, use dashboard formula (cartons / divisor) for banana packs
      const packData = existing.packs.get(r.pack) || { cartons: 0, containers: 0 };
      packData.cartons += r.cartons;
      
      // Calculate containers for pack breakdown using dashboard formula
      const divisor = getCartonToContainerDivisor(r.pack);
      let packContainerValue = 0;
      
      if (divisor !== null) {
        // Use cartons / divisor for banana packs
        packContainerValue = r.cartons / divisor;
      } else {
        // For other packs (like pineapples), use existing lCont
        packContainerValue = r.lCont;
      }
      
      packData.containers += packContainerValue;
      existing.packs.set(r.pack, packData);

      supplierMap.set(r.supplier, existing);
    });

    return Array.from(supplierMap.entries())
      .map(([supplier, data]) => ({
        supplier,
        cartons: data.cartons,
        containers: parseFloat(data.containers.toFixed(2)),
        packBreakdown: Array.from(data.packs.entries())
          .map(([pack, stats]) => ({
            pack,
            cartons: stats.cartons,
            containers: parseFloat(stats.containers.toFixed(2)),
          }))
          .sort(sortPacks),
      }))
      .sort((a, b) => a.supplier.localeCompare(b.supplier));
  }, [data]);


  const totalCartons = data.reduce((sum, r) => sum + r.cartons, 0);
  // For supplier/analysis view, use lCont directly from the data
  const totalContainers = data.reduce((sum, r) => sum + r.lCont, 0);
  const uniqueSuppliers = supplierStats.length;
  
  // Get unique packs from supplier stats
  const uniquePacks = useMemo(() => {
    const packSet = new Set<string>();
    supplierStats.forEach(stat => {
      stat.packBreakdown.forEach(pack => packSet.add(pack.pack));
    });
    return packSet.size;
  }, [supplierStats]);

  // Prepare chart data for cartons and containers percentage by S.Line
  const sLineStats = useMemo(() => {
    const sLineMap = new Map<string, {
      cartons: number;
      containers: number;
    }>();

    data.forEach(r => {
      const existing = sLineMap.get(r.sLine) || {
        cartons: 0,
        containers: 0,
      };

      existing.cartons += r.cartons;
      existing.containers += r.lCont;

      sLineMap.set(r.sLine, existing);
    });

    return Array.from(sLineMap.entries())
      .map(([sLine, stats]) => ({
        name: sLine,
        cartons: stats.cartons,
        containers: parseFloat(stats.containers.toFixed(2)),
        cartonsPercent: totalCartons > 0 ? (stats.cartons / totalCartons) * 100 : 0,
        containersPercent: totalContainers > 0 ? (stats.containers / totalContainers) * 100 : 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data, totalCartons, totalContainers]);

  // Color palette for charts
  const COLORS = [
    'hsl(var(--primary))',
    'hsl(var(--accent))',
    'hsl(var(--muted-foreground))',
    '#8b5cf6',
    '#ec4899',
    '#f59e0b',
    '#10b981',
    '#3b82f6',
    '#ef4444',
    '#6366f1',
  ];

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-3">
          <div>
            <h1 className="text-3xl font-bold font-heading text-foreground tracking-tight mb-2">Analysis</h1>
            <div className="w-16 h-1 bg-gradient-to-r from-primary to-secondary rounded-full" />
          </div>
          <p className="text-sm text-muted-foreground">Comprehensive insights and supplier breakdown</p>
        </div>
        {/* Fruit Selector Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant={selectedFruit === 'BANANAS' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelectFruit('BANANAS')}
            className={cn(
              'flex items-center gap-2',
              selectedFruit === 'BANANAS' 
                ? 'bg-accent text-accent-foreground hover:bg-accent/90' 
                : 'hover:bg-muted'
            )}
          >
            <Banana className="w-4 h-4" />
            <span>Bananas</span>
          </Button>
          <Button
            variant={selectedFruit === 'PINEAPPLES' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelectFruit('PINEAPPLES')}
            className={cn(
              'flex items-center gap-2',
              selectedFruit === 'PINEAPPLES' 
                ? 'bg-accent text-accent-foreground hover:bg-accent/90' 
                : 'hover:bg-muted'
            )}
          >
            <PineappleIcon className="w-4 h-4" />
            <span>Pineapples</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Cartons"
          value={totalCartons}
          variant="large"
          style={{ animationDelay: '0ms' } as React.CSSProperties}
        />
        <StatCard
          label="Total Containers"
          value={totalContainers}
          variant="large"
          style={{ animationDelay: '50ms' } as React.CSSProperties}
        />
        <StatCard
          label="Suppliers"
          value={uniqueSuppliers}
          variant="large"
          style={{ animationDelay: '100ms' } as React.CSSProperties}
        />
        <StatCard
          label="Pack Types"
          value={uniquePacks}
          variant="large"
          style={{ animationDelay: '150ms' } as React.CSSProperties}
        />
      </div>

      {/* Distribution Charts */}
      <section className="mb-8">
        <h2 className="text-lg font-heading font-semibold text-foreground mb-6">
          Distribution by S.Line
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cartons Distribution Donut Chart */}
          <div className="bg-gradient-to-br from-card to-card/50 border border-border/60 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden relative">
            {/* Decorative gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-1">
                    Cartons Distribution
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium">
                    {totalCartons.toLocaleString()} total cartons
                  </p>
                </div>
              </div>
              
              <div className="relative" style={{ zIndex: 1 }}>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <defs>
                      {sLineStats.map((entry, index) => (
                        <linearGradient
                          key={`gradient-cartons-${index}`}
                          id={`gradientCartons${index}`}
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="100%"
                        >
                          <stop offset="0%" stopColor={COLORS[index % COLORS.length]} stopOpacity={1} />
                          <stop offset="100%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.7} />
                        </linearGradient>
                      ))}
                    </defs>
                    <Pie
                      data={sLineStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={2}
                      dataKey="cartons"
                      stroke="hsl(var(--background))"
                      strokeWidth={3}
                      startAngle={90}
                      endAngle={-270}
                      animationBegin={0}
                      animationDuration={800}
                    >
                      {sLineStats.map((entry, index) => (
                        <Cell 
                          key={`cell-cartons-${index}`} 
                          fill={`url(#gradientCartons${index})`}
                          style={{
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                            transition: 'all 0.3s ease',
                          }}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload[0]) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl z-50 relative" style={{ zIndex: 9999 }}>
                              <p className="font-semibold text-sm text-foreground mb-1">
                                {data.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">
                                  {data.cartons.toLocaleString()}
                                </span>{' '}
                                cartons
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                <span className="font-semibold text-primary">
                                  {data.cartonsPercent.toFixed(1)}%
                                </span>{' '}
                                of total
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                      wrapperStyle={{ zIndex: 9999 }}
                      contentStyle={{ zIndex: 9999 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Center Statistics */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ zIndex: 0 }}>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-foreground mb-1">
                      {totalCartons.toLocaleString()}
                    </p>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Total Cartons
                    </p>
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2 max-w-[140px]">
                      {sLineStats.slice(0, 3).map((entry, index) => (
                        <div key={index} className="flex items-center gap-1.5">
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-[10px] font-medium text-muted-foreground">
                            {entry.cartonsPercent.toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Legend */}
              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="grid grid-cols-2 gap-2">
                  {sLineStats.map((entry, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {entry.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {entry.cartonsPercent.toFixed(1)}% • {entry.cartons.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Containers Distribution Donut Chart */}
          <div className="bg-gradient-to-br from-card to-card/50 border border-border/60 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden relative">
            {/* Decorative gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5 pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-1">
                    Containers Distribution
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium">
                    {totalContainers.toFixed(2)} total containers
                  </p>
                </div>
              </div>
              
              <div className="relative" style={{ zIndex: 1 }}>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <defs>
                      {sLineStats.map((entry, index) => (
                        <linearGradient
                          key={`gradient-containers-${index}`}
                          id={`gradientContainers${index}`}
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="100%"
                        >
                          <stop offset="0%" stopColor={COLORS[index % COLORS.length]} stopOpacity={1} />
                          <stop offset="100%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.7} />
                        </linearGradient>
                      ))}
                    </defs>
                    <Pie
                      data={sLineStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={2}
                      dataKey="containers"
                      stroke="hsl(var(--background))"
                      strokeWidth={3}
                      startAngle={90}
                      endAngle={-270}
                      animationBegin={100}
                      animationDuration={800}
                    >
                      {sLineStats.map((entry, index) => (
                        <Cell 
                          key={`cell-containers-${index}`} 
                          fill={`url(#gradientContainers${index})`}
                          style={{
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                            transition: 'all 0.3s ease',
                          }}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload[0]) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl z-50 relative" style={{ zIndex: 9999 }}>
                              <p className="font-semibold text-sm text-foreground mb-1">
                                {data.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">
                                  {data.containers.toFixed(2)}
                                </span>{' '}
                                containers
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                <span className="font-semibold text-primary">
                                  {data.containersPercent.toFixed(1)}%
                                </span>{' '}
                                of total
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                      wrapperStyle={{ zIndex: 9999 }}
                      contentStyle={{ zIndex: 9999 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Center Statistics */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ zIndex: 0 }}>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-foreground mb-1">
                      {totalContainers.toFixed(2)}
                    </p>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Total Containers
                    </p>
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2 max-w-[140px]">
                      {sLineStats.slice(0, 3).map((entry, index) => (
                        <div key={index} className="flex items-center gap-1.5">
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-[10px] font-medium text-muted-foreground">
                            {entry.containersPercent.toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Legend */}
              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="grid grid-cols-2 gap-2">
                  {sLineStats.map((entry, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {entry.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {entry.containersPercent.toFixed(1)}% • {entry.containers.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Supplier Cards Grid */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading font-semibold text-foreground">
            Supplier Performance
          </h2>
          <p className="text-sm text-muted-foreground">
            {supplierStats.length} {supplierStats.length === 1 ? 'supplier' : 'suppliers'}
          </p>
        </div>
        {supplierStats.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <p className="text-muted-foreground">No supplier data available for the selected filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {supplierStats.map((stat, index) => (
              <SupplierCard
                key={stat.supplier}
                supplier={stat.supplier}
                cartons={stat.cartons}
                containers={stat.containers}
                packBreakdown={stat.packBreakdown}
                style={{ animationDelay: `${index * 50}ms` } as React.CSSProperties}
              />
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
