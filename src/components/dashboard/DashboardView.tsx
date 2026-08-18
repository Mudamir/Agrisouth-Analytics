import { useMemo, useState, useCallback, useEffect } from 'react';
import { FruitType, PackStats, ShippingRecord, FilterState } from '@/types/shipping';
import { StatCard } from './StatCard';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Settings, Lock, Check, Minus } from 'lucide-react';
import { usePackRequirements } from '@/hooks/usePackRequirements';
import { usePacks } from '@/hooks/usePacks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Settings, Lock, Check, Minus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import logoImage from '@/Images/AGSouth-Icon.png';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DashboardViewProps {
  fruit: FruitType;
  packStats: PackStats[];
  totalStats: { containers: number; cartons: number };
  supplierStats: { supplier: string; containers: number; cartons: number }[];
  data: ShippingRecord[];
  filteredData: ShippingRecord[];
  filters: FilterState;
}

export function DashboardView({ fruit, packStats, totalStats, supplierStats, data, filteredData, filters }: DashboardViewProps) {
  const { isAdmin } = useAuth();
  
  // Fetch packs from database
  const { packNames: dbPacks, isLoading: packsLoading } = usePacks(fruit);
  
  // Get current year from data (most recent year, or use current year as fallback)
  const currentYear = useMemo(() => {
    if (data.length === 0) return new Date().getFullYear();
    const years = [...new Set(data.map(r => r.year))].sort((a, b) => b - a);
    return years[0] || new Date().getFullYear();
  }, [data]);

  // Use filtered year if available, otherwise use currentYear
  const displayYear = useMemo(() => {
    return filters.year !== null ? filters.year : currentYear;
  }, [filters.year, currentYear]);

  // Requirements management
  const [settingsYear, setSettingsYear] = useState(displayYear);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Main hook for display - use filtered year
  const { 
    getRequirement,
    reload: reloadMainRequirements
  } = usePackRequirements(fruit, displayYear);
  
  // Hook for dialog editing - use settingsYear (can be different from displayYear for editing other years)
  const { 
    requirements: dialogRequirements, 
    isLoading: dialogRequirementsLoading,
    updateRequirements,
    reload: reloadDialogRequirements
  } = usePackRequirements(fruit, settingsYear);
  
  const [tempRequirements, setTempRequirements] = useState<Record<string, number>>({});
  const [isInitializing, setIsInitializing] = useState(false);
  
  // Use packs from database, or fallback to packStats if database packs are not available
  const availablePacks = useMemo(() => {
    if (dbPacks.length > 0) {
      return dbPacks;
    }
    // Fallback to packs from packStats (from actual data)
    return packStats.map(stat => stat.pack);
  }, [dbPacks, packStats]);

  // Get available years from data (ensure displayYear is included)
  const availableYears = useMemo(() => {
    const years = [...new Set(data.map(r => r.year))];
    // Ensure displayYear is included even if not in data
    if (!years.includes(displayYear)) {
      years.push(displayYear);
    }
    return years.sort((a, b) => b - a);
  }, [data, displayYear]);

  // Reload requirements when year changes in dialog
  useEffect(() => {
    if (isSettingsOpen) {
      setIsInitializing(true);
      const loadData = async () => {
        await reloadDialogRequirements();
      };
      loadData();
    }
  }, [settingsYear, isSettingsOpen, reloadDialogRequirements]);

  // Initialize temp requirements when dialogRequirements are loaded
  useEffect(() => {
    if (isSettingsOpen && !dialogRequirementsLoading) {
      // Initialize tempRequirements with loaded data from database
      // This will be an empty object if no requirements exist, which is fine
      setTempRequirements({ ...dialogRequirements });
      setIsInitializing(false);
    }
  }, [dialogRequirements, dialogRequirementsLoading, isSettingsOpen]);

  // Initialize temp requirements when dialog opens
  const handleOpenSettings = () => {
    setSettingsYear(displayYear);
    setIsSettingsOpen(true);
    // The useEffect will handle reloading requirements
  };

  // Helper function to check if pack is 18KG
  const is18KG = (pack: string): boolean => {
    const packUpper = pack.toUpperCase().trim();
    return packUpper === '18KG' || packUpper === '18 KG A' || packUpper.includes('18 KG');
  };

  // Calculate weekly trend for the selected fruit only (using filteredData to respect year filter)
  const weeklyTrend = useMemo(() => {
    const weekMap = new Map<number, number>();
    filteredData
      .filter(r => r.item === fruit) // Filter by selected fruit
      .forEach(r => {
        const current = weekMap.get(r.week) || 0;
        weekMap.set(r.week, current + r.cartons);
      });
    return Array.from(weekMap.entries())
      .map(([week, cartons]) => ({ week, cartons }))
      .sort((a, b) => a.week - b.week);
  }, [filteredData, fruit]);

  // Calculate number of weeks in the filtered data
  const numberOfWeeks = useMemo(() => {
    // Get unique weeks from the filtered data for the display year and fruit
    // Use filteredData since packStats is calculated from filteredData
    const weeksInData = new Set(
      filteredData
        .filter(r => r.item === fruit && r.year === displayYear)
        .map(r => r.week)
    );
    // If no weeks found, default to 52 (full year)
    return weeksInData.size > 0 ? weeksInData.size : 52;
  }, [filteredData, fruit, displayYear]);

  // Calculate containers by pack for comparison with requirements
  const packContainers = useMemo(() => {
    // Calculate total achieved containers
    const totalAchieved = packStats.reduce((sum, stat) => sum + stat.containers, 0);
    
    return packStats.map(stat => {
      const achieved = parseFloat(stat.containers.toFixed(2));
      
      // Get requirement from hook (stored requirements - this is WEEKLY requirement)
      const specificReq = getRequirement(stat.pack);
      let required: number;
      
      if (specificReq !== null && specificReq > 0) {
        // Multiply weekly requirement by number of weeks in the filtered period
        required = parseFloat((specificReq * numberOfWeeks).toFixed(2));
      } else {
        // No specific requirement: use 80% of achieved as requirement
        const packPercentage = totalAchieved > 0 ? achieved / totalAchieved : 1 / packStats.length;
        const totalRequired = totalAchieved * 0.8;
        required = parseFloat((totalRequired * packPercentage).toFixed(2));
      }
      
      return {
        pack: stat.pack,
        achieved: achieved,
        required: required,
        difference: parseFloat((achieved - required).toFixed(2)),
        status: achieved >= required ? 'met' : 'below'
      };
    }).sort((a, b) => b.achieved - a.achieved); // Sort by achieved containers (descending)
  }, [packStats, getRequirement, displayYear, numberOfWeeks]); // Added numberOfWeeks to dependencies
  return (
    <div className="flex-1 min-h-0 p-6 lg:p-8 overflow-y-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-white border border-border shadow-sm overflow-hidden flex-shrink-0">
          <img 
            src={logoImage} 
            alt="Agrisouth Logo" 
            className="w-full h-full object-contain p-1"
          />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Agrisouth (Jersey) Ltd.
          </p>
          <h1 className="text-xl font-bold font-heading text-foreground leading-tight">
            Pacific Branch Office
          </h1>
          <p className="text-sm font-semibold text-primary mt-0.5">
            {fruit === 'BANANAS' ? 'Sharbatly Bananas' : 'Pineapples'}
          </p>
        </div>
      </div>

      {/* Container Stats */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">
          Number of Containers — {fruit === 'BANANAS' ? 'Sharbatly Bananas' : 'Pineapples'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {packStats.map((stat, index) => (
            <StatCard
              key={stat.pack}
              label={stat.pack}
              value={stat.containers}
              decimalPlaces={2}
              className="animate-fade-in"
              style={is18KG(stat.pack) 
                ? { 
                    animationDelay: `${index * 50}ms`,
                    '--stat-card-bg': 'linear-gradient(to bottom, hsl(199, 89%, 48%), hsl(210, 69%, 28%))',
                    background: 'linear-gradient(to bottom, hsl(199, 89%, 48%), hsl(210, 69%, 28%))',
                    backgroundImage: 'none',
                  } as React.CSSProperties
                : { animationDelay: `${index * 50}ms` } as React.CSSProperties}
            />
          ))}
        </div>
      </section>

      {/* Carton Stats */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">
          Number of Cartons — {fruit === 'BANANAS' ? 'Sharbatly Bananas' : 'Pineapples'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {packStats.map((stat, index) => (
            <StatCard
              key={`cartons-${stat.pack}`}
              label={stat.pack}
              value={stat.cartons}
              className="animate-fade-in"
              style={is18KG(stat.pack) 
                ? { 
                    animationDelay: `${index * 50}ms`,
                    '--stat-card-bg': 'linear-gradient(to bottom, hsl(199, 89%, 48%), hsl(210, 69%, 28%))',
                    background: 'linear-gradient(to bottom, hsl(199, 89%, 48%), hsl(210, 69%, 28%))',
                    backgroundImage: 'none',
                  } as React.CSSProperties
                : { animationDelay: `${index * 50}ms` } as React.CSSProperties}
            />
          ))}
        </div>
      </section>

      {/* Totals - Below Cartons */}
      <section className="grid grid-cols-2 gap-4 mb-6">
        <div className="stat-card">
          <p className="stat-card-label">Total Number of Containers Shipped</p>
          <p className="stat-card-value text-3xl">{Math.round(totalStats.containers).toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="stat-card-label">Total Number of Cartons Shipped</p>
          <p className="stat-card-value text-3xl">{totalStats.cartons.toLocaleString()}</p>
        </div>
      </section>

      {/* Supplier Stats - Moved Below Pack Breakdowns */}
      {supplierStats.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            By Supplier
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {supplierStats.slice(0, 8).map((stat, index) => (
              <div 
                key={stat.supplier} 
                className="bg-card border border-border rounded-xl p-3 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` } as React.CSSProperties}
              >
                <p className="text-xs font-medium text-muted-foreground truncate">{stat.supplier}</p>
                <p className="text-sm font-semibold">{stat.containers.toLocaleString()} containers</p>
                <p className="text-lg font-bold font-heading text-primary">
                  {stat.cartons.toLocaleString()} <span className="text-xs font-normal">cartons</span>
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pack Containers vs Requirements - Elegant Design */}
      <section className="mb-6">
        <div className="bg-card rounded-xl p-4 shadow-sm border border-border animate-fade-in">
          {/* Elegant Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-semibold text-lg text-foreground mb-1">
                Containers by Pack: Delivered vs Requirement
              </h3>
              <p className="text-sm text-muted-foreground">
                {fruit}
              </p>
            </div>
            {/* Settings Button - Minimal */}
            <Dialog open={isSettingsOpen} onOpenChange={(open) => {
              setIsSettingsOpen(open);
              if (open) {
                handleOpenSettings();
              } else {
                setTempRequirements({});
              }
            }}>
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "h-8 w-8 p-0 relative",
                  !isAdmin && "opacity-75"
                )}
                onClick={handleOpenSettings}
                title={isAdmin ? "Edit requirements" : "View requirements (Read-only)"}
              >
                <Settings className="w-4 h-4" />
                {!isAdmin && (
                  <Lock className="w-3 h-3 absolute -top-0.5 -right-0.5 text-muted-foreground bg-background rounded-full p-0.5" />
                )}
              </Button>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    Edit Container Requirements
                    {!isAdmin && (
                      <span className="text-xs text-muted-foreground font-normal flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        (Read-only)
                      </span>
                    )}
                  </DialogTitle>
                  <DialogDescription>
                    Set weekly container requirements for each pack size for {fruit}. These values are constant for the entire year.
                    {!isAdmin && (
                      <span className="block mt-2 text-xs text-muted-foreground">
                        Only administrators can edit container requirements.
                      </span>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* Year Selection */}
                  <div className="flex items-center gap-4 pb-4 border-b">
                    <Label htmlFor="settings-year" className="w-32 font-semibold">
                      Year
                    </Label>
                    <Select
                      value={settingsYear.toString()}
                      onValueChange={async (value) => {
                        const year = parseInt(value);
                        setSettingsYear(year);
                        // Reload requirements for new year
                        setTempRequirements({});
                      }}
                    >
                      <SelectTrigger id="settings-year" className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableYears.map(year => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground ml-auto">
                      Weekly requirement (constant for the year)
                    </p>
                  </div>
                  {/* Pack Requirements - using packs from database */}
                  {packsLoading || dialogRequirementsLoading || isInitializing ? (
                    <div className="text-center py-4 text-muted-foreground">
                      Loading requirements...
                    </div>
                  ) : availablePacks.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      No packs found. Please add packs in the Configuration page.
                    </div>
                  ) : (
                    availablePacks.map((pack) => {
                      // Get current delivered containers for this pack from packStats
                      const packStat = packStats.find(ps => ps.pack === pack);
                      const deliveredContainers = packStat ? packStat.containers : 0;
                      
                      // Determine the value to display: prioritize tempRequirements (user edits), then dialogRequirements (from DB)
                      const getDisplayValue = () => {
                        // If user has edited this pack, use tempRequirements
                        if (tempRequirements[pack] !== undefined) {
                          return tempRequirements[pack] === 0 ? '' : String(tempRequirements[pack]);
                        }
                        // Otherwise, use value from database
                        if (dialogRequirements[pack] !== undefined && dialogRequirements[pack] > 0) {
                          return String(dialogRequirements[pack]);
                        }
                        return '';
                      };
                      
                      return (
                        <div key={pack} className="flex items-center gap-4">
                          <Label htmlFor={`req-${pack}`} className="w-32 font-semibold">
                            {pack}
                          </Label>
                          <Input
                            id={`req-${pack}`}
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Weekly containers"
                            value={getDisplayValue()}
                            onChange={(e) => {
                              if (!isAdmin) return;
                              const inputValue = e.target.value;
                              // Allow empty string while typing, but store as 0 for empty
                              if (inputValue === '') {
                                setTempRequirements(prev => ({
                                  ...prev,
                                  [pack]: 0
                                }));
                              } else {
                                const numValue = parseFloat(inputValue);
                                if (!isNaN(numValue)) {
                                  setTempRequirements(prev => ({
                                    ...prev,
                                    [pack]: numValue
                                  }));
                                }
                              }
                            }}
                            className="flex-1"
                            disabled={!isAdmin}
                          />
                          <span className="text-sm text-muted-foreground w-24">
                            containers
                          </span>
                          {packStat && (
                            <span className="text-xs text-muted-foreground">
                              (Delivered: {deliveredContainers.toFixed(2)})
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setTempRequirements({});
                      setIsSettingsOpen(false);
                    }}
                  >
                    {isAdmin ? 'Cancel' : 'Close'}
                  </Button>
                  {isAdmin && (
                    <Button
                      onClick={async () => {
                        if (!isAdmin) return;
                        try {
                        // Update requirements for selected year - use packs from database
                        const updated: Record<string, number> = {};
                        availablePacks.forEach(pack => {
                          const tempValue = tempRequirements[pack];
                          if (tempValue !== undefined && tempValue > 0) {
                            updated[pack] = tempValue;
                          } else {
                            // Keep existing requirement if not changed
                            const existing = dialogRequirements[pack];
                            if (existing !== undefined && existing > 0) {
                              updated[pack] = existing;
                            }
                          }
                        });
                          
                          await updateRequirements(updated);
                          
                          // Reload requirements for dialog
                          await reloadDialogRequirements();
                          
                          // If we saved for the display year, also reload the main hook to update the graph
                          if (settingsYear === displayYear) {
                            await reloadMainRequirements();
                          }
                          
                        setTempRequirements({});
                        setIsSettingsOpen(false);
                        
                        // Show success message
                        toast.success(`Container requirements saved for ${settingsYear}`);
                        } catch (error: any) {
                          console.error('Error saving requirements:', error);
                          toast.error('Failed to save requirements: ' + (error.message || 'Unknown error'));
                        }
                      }}
                    >
                      Save Requirements
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {packContainers.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              <p className="text-sm">No data available for the selected filters</p>
            </div>
          ) : (
            <div className="space-y-5">
              {(() => {
                const onTarget = packContainers.filter((row) => row.required > 0 && row.achieved >= row.required).length;
                const tracked = packContainers.filter((row) => row.required > 0).length;
                return (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                      {packContainers.length} packs
                    </span>
                    <span className="rounded-full bg-[#123A63]/10 px-2.5 py-1 font-medium text-[#123A63]">
                      {onTarget} on target
                    </span>
                    {tracked - onTarget > 0 && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-500">
                        {tracked - onTarget} below requirement
                      </span>
                    )}
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      Bar fill = delivered · track end = 100% of requirement
                    </span>
                  </div>
                );
              })()}

              <div className="hidden sm:grid grid-cols-[minmax(160px,1.15fr)_minmax(0,1.6fr)_auto] gap-4 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <span>Pack</span>
                <span>Progress to requirement</span>
                <span className="text-right">Delivered / Required</span>
              </div>

              <div className="divide-y divide-border/70">
                {packContainers.map((row) => {
                  const pct = row.required > 0 ? (row.achieved / row.required) * 100 : 0;
                  const barWidth = row.required > 0 ? Math.min(pct, 100) : 0;
                  const met = row.required > 0 && row.achieved >= row.required;

                  return (
                    <div
                      key={row.pack}
                      className="grid grid-cols-1 sm:grid-cols-[minmax(160px,1.15fr)_minmax(0,1.6fr)_auto] gap-3 sm:gap-4 items-center py-3.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{row.pack}</p>
                        <p className="text-[11px] text-muted-foreground sm:hidden mt-0.5">
                          {row.achieved.toLocaleString(undefined, { maximumFractionDigits: 1 })} / {row.required.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                        </p>
                      </div>

                      <div className="relative h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={cn(
                            'absolute inset-y-0 left-0 rounded-full transition-all duration-500',
                            met ? 'bg-sky-600' : 'bg-[#123A63]'
                          )}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-end gap-3 tabular-nums">
                        <div className="hidden sm:block text-right">
                          <p className="text-sm font-semibold text-foreground">
                            {row.achieved.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                            <span className="font-medium text-muted-foreground">
                              {' / '}
                              {row.required.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                            </span>
                          </p>
                        </div>
                        <span
                          className={cn(
                            'inline-flex min-w-[4.25rem] items-center justify-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold',
                            met
                              ? 'bg-sky-50 text-sky-800'
                              : 'bg-slate-100 text-slate-600'
                          )}
                        >
                          {met ? <Check className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                          {row.required > 0 ? `${pct.toFixed(0)}%` : '—'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Weekly Shipment Trend */}
      <section className="mb-6">
        <div className="bg-card rounded-xl p-6 shadow-sm border border-border animate-fade-in">
          <div className="mb-4">
            <h3 className="font-heading font-semibold text-foreground mb-2">Weekly Shipment Trend</h3>
            <p className="text-sm text-muted-foreground">Cartons shipped by week</p>
          </div>
          {weeklyTrend.length === 0 ? (
            <div className="flex items-center justify-center h-[350px] text-muted-foreground">
              <p>No data available for the selected filters</p>
        </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="week" 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => {
                    // Only show labels for weeks divisible by 5 (W5, W10, W15, W20, etc.)
                    if (value % 5 === 0) {
                      return `W${value}`;
                    }
                    return '';
                  }}
                  interval={0}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    padding: '12px',
                  }}
                  formatter={(value: number) => [value.toLocaleString(), 'Cartons']}
                  labelStyle={{ 
                    fontWeight: 600, 
                    marginBottom: '6px',
                    color: 'hsl(var(--foreground))',
                    fontSize: '13px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="cartons" 
                  stroke="#123A63" 
                  strokeWidth={3}
                  dot={{ fill: '#123A63', stroke: '#fff', strokeWidth: 1.5, r: 4 }}
                  activeDot={{ r: 6, fill: '#0B1D36', stroke: '#fff', strokeWidth: 2 }}
                  name={fruit}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>
    </div>
  );
}

