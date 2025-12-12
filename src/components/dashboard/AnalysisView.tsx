import { useMemo } from 'react';
import { ShippingRecord, FruitType } from '@/types/shipping';
import { SupplierCard } from './SupplierCard';
import { StatCard } from './StatCard';
import { Button } from '@/components/ui/button';
import { Banana, TreePine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface AnalysisViewProps {
  data: ShippingRecord[];
  selectedFruit: FruitType;
  onSelectFruit: (fruit: FruitType) => void;
}

export function AnalysisView({ data, selectedFruit, onSelectFruit }: AnalysisViewProps) {
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

      existing.cartons += r.cartons;
      existing.containers += r.lCont;

      const packData = existing.packs.get(r.pack) || { cartons: 0, containers: 0 };
      packData.cartons += r.cartons;
      packData.containers += r.lCont;
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
        <div>
          <h1 className="page-title mb-2">ANALYSIS</h1>
          <p className="text-muted-foreground">Comprehensive insights and supplier breakdown</p>
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
            <TreePine className="w-4 h-4" />
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
          {/* Cartons Distribution Pie Chart */}
          <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Cartons Distribution
              </h3>
              <span className="text-xs text-muted-foreground font-medium">
                {totalCartons.toLocaleString()} total
              </span>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={sLineStats}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, cartonsPercent }) => 
                    cartonsPercent > 3 ? `${name}\n${cartonsPercent.toFixed(1)}%` : ''
                  }
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="cartons"
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                >
                  {sLineStats.map((entry, index) => (
                    <Cell key={`cell-cartons-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  formatter={(value: number, name: string, props: any) => [
                    `${value.toLocaleString()} cartons (${props.payload.cartonsPercent.toFixed(1)}%)`,
                    props.payload.name,
                  ]}
                />
                <Legend
                  verticalAlign="bottom"
                  height={60}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  formatter={(value, entry: any) => (
                    <span className="text-xs">
                      <span className="font-semibold">{value}</span>
                      <span className="text-muted-foreground ml-1">
                        {entry.payload.cartonsPercent.toFixed(1)}%
                      </span>
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Containers Distribution Pie Chart */}
          <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Containers Distribution
              </h3>
              <span className="text-xs text-muted-foreground font-medium">
                {totalContainers.toFixed(2)} total
              </span>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={sLineStats}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, containersPercent }) => 
                    containersPercent > 3 ? `${name}\n${containersPercent.toFixed(1)}%` : ''
                  }
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="containers"
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                >
                  {sLineStats.map((entry, index) => (
                    <Cell key={`cell-containers-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  formatter={(value: number, name: string, props: any) => [
                    `${value.toFixed(2)} containers (${props.payload.containersPercent.toFixed(1)}%)`,
                    props.payload.name,
                  ]}
                />
                <Legend
                  verticalAlign="bottom"
                  height={60}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  formatter={(value, entry: any) => (
                    <span className="text-xs">
                      <span className="font-semibold">{value}</span>
                      <span className="text-muted-foreground ml-1">
                        {entry.payload.containersPercent.toFixed(1)}%
                      </span>
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
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
