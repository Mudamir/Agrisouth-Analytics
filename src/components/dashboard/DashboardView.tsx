import { useMemo, useState, useCallback, useEffect } from 'react';
import { FruitType, PackStats, ShippingRecord, FilterState } from '@/types/shipping';
import { StatCard } from './StatCard';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, BarChart, Bar, Cell } from 'recharts';
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
import { Settings, Lock } from 'lucide-react';
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
    <div className="flex-1 p-6 overflow-y-auto">
      {/* Header - Unified Component */}
      <div className="flex items-center justify-center gap-8 mb-6">
        {/* Logo - Larger Circular */}
        <div className="w-32 h-32 rounded-full bg-white shadow-xl border-2 border-border/20 flex items-center justify-center overflow-hidden ring-4 ring-primary/5 hover:ring-primary/10 transition-all duration-300 hover:scale-105 flex-shrink-0">
          <img 
            src={logoImage} 
            alt="Agrisouth Logo" 
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Text Content - Centered */}
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold font-heading text-foreground leading-tight">
            Agrisouth Fruits Pacific Branch Office
          </h1>
          <p className="page-title text-3xl font-extrabold text-orange-500">{fruit}</p>
        </div>
      </div>

      {/* Container Stats */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 text-center">
          Number of Containers - {fruit === 'BANANAS' ? 'Sharbatly Bananas' : 'Pineapples'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {packStats.map((stat, index) => (
            <StatCard
              key={stat.pack}
              label={stat.pack}
              value={stat.containers}
              className={is18KG(stat.pack) 
                ? "animate-fade-in bg-gradient-to-b from-[hsl(18,75%,45%)] to-[hsl(18,70%,40%)] text-white" 
                : "animate-fade-in"}
              style={{ animationDelay: `${index * 50}ms` } as React.CSSProperties}
            />
          ))}
        </div>
      </section>

      {/* Carton Stats */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 text-center">
          Number of Cartons - {fruit === 'BANANAS' ? 'Sharbatly Bananas' : 'Pineapples'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {packStats.map((stat, index) => (
            <StatCard
              key={`cartons-${stat.pack}`}
              label={stat.pack}
              value={stat.cartons}
              className={is18KG(stat.pack) 
                ? "animate-fade-in bg-gradient-to-b from-[hsl(18,75%,45%)] to-[hsl(18,70%,40%)] text-white" 
                : "animate-fade-in"}
              style={{ animationDelay: `${index * 50}ms` } as React.CSSProperties}
            />
          ))}
        </div>
      </section>

      {/* Totals - Below Cartons */}
      <section className="grid grid-cols-2 gap-4 mb-6">
        <div className="stat-card">
          <p className="stat-card-label">Total Number of Containers Shipped</p>
          <p className="stat-card-value text-3xl">{totalStats.containers.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="stat-card-label">Total Number of Cartons Shipped</p>
          <p className="stat-card-value text-3xl">{totalStats.cartons.toLocaleString()}</p>
        </div>
      </section>

      {/* Supplier Stats - Moved Below Pack Breakdowns */}
      {supplierStats.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 text-center">
            By Supplier
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {supplierStats.slice(0, 8).map((stat, index) => (
              <div 
                key={stat.supplier} 
                className="bg-card border border-border rounded-lg p-3 animate-fade-in"
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
        <div className="bg-card rounded-lg p-4 shadow-sm border border-border animate-fade-in">
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
            <div className="flex items-center justify-center h-[400px] text-muted-foreground">
              <p className="text-sm">No data available for the selected filters</p>
            </div>
          ) : (
            <div>
              {/* Elegant Chart Design */}
              <ResponsiveContainer width="100%" height={360}>
                <BarChart 
                  data={packContainers} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  barCategoryGap="20%"
                >
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="hsl(var(--border))" 
                    opacity={0.2}
                    vertical={false}
                  />
                  <XAxis 
                    dataKey="pack" 
                    tick={{ 
                      fontSize: 13, 
                      fill: 'hsl(var(--foreground))',
                      fontWeight: 500,
                      fontFamily: 'Montserrat, sans-serif'
                    }}
                    angle={0}
                    textAnchor="middle"
                    height={50}
                    interval={0}
                  />
                  <YAxis 
                    tick={{ 
                      fontSize: 13, 
                      fill: 'hsl(var(--muted-foreground))',
                      fontWeight: 500,
                      fontFamily: 'Montserrat, sans-serif'
                    }}
                    width={60}
                    tickFormatter={(value) => value.toFixed(0)}
                    label={{ 
                      value: 'Containers', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { 
                        textAnchor: 'middle', 
                        fill: 'hsl(var(--foreground))',
                        fontSize: '13px',
                        fontWeight: 600,
                        fontFamily: 'Montserrat, sans-serif'
                      } 
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
                      padding: '12px',
                    }}
                    cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }}
                    formatter={(value: number, name: string, props: any) => {
                      // Always show both Delivered and Requirement values
                      const delivered = props.payload?.achieved || 0;
                      const required = props.payload?.required || 0;
                      const deliveredFormatted = parseFloat(delivered.toFixed(2));
                      const requiredFormatted = parseFloat(required.toFixed(2));
                      
                      const percentage = required > 0
                        ? ((delivered / required) * 100).toFixed(1)
                        : null;
                      
                      // Return both values
                      if (name === 'achieved') {
                        const displayValue = percentage 
                          ? `${deliveredFormatted.toLocaleString()} (${percentage}%)`
                          : `${deliveredFormatted.toLocaleString()}`;
                        return [displayValue, 'Delivered'];
                      } else {
                        const displayValue = `${requiredFormatted.toLocaleString()}`;
                        return [displayValue, 'Requirement'];
                      }
                    }}
                    content={(props: any) => {
                      if (!props.active || !props.payload || props.payload.length === 0) {
                        return null;
                      }
                      
                      const data = props.payload[0].payload;
                      const pack = data.pack || '';
                      const delivered = data.achieved || 0;
                      const required = data.required || 0;
                      const deliveredFormatted = parseFloat(delivered.toFixed(2));
                      const requiredFormatted = parseFloat(required.toFixed(2));
                      const percentage = required > 0
                        ? ((delivered / required) * 100).toFixed(1)
                        : null;
                      
                      const deliveredColor = fruit === 'BANANAS' 
                        ? 'hsl(45, 90%, 50%)' 
                        : 'hsl(18, 85%, 55%)';
                      const requiredColor = 'hsl(190, 100%, 25%)';
                      
                      return (
                        <div style={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          padding: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          fontFamily: 'Montserrat, sans-serif'
                        }}>
                          <p style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: 'hsl(var(--foreground))',
                            marginBottom: '8px',
                            fontFamily: 'Montserrat, sans-serif'
                          }}>
                            {pack}
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{
                                display: 'inline-block',
                                width: '12px',
                                height: '12px',
                                backgroundColor: deliveredColor,
                                borderRadius: '2px'
                              }}></span>
                              <span style={{
                                fontSize: '13px',
                                fontWeight: 600,
                                color: 'hsl(var(--foreground))',
                                fontFamily: 'Montserrat, sans-serif'
                              }}>
                                Delivered: {deliveredFormatted.toLocaleString()}
                                {percentage && ` (${percentage}%)`}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{
                                display: 'inline-block',
                                width: '12px',
                                height: '12px',
                                backgroundColor: requiredColor,
                                borderRadius: '2px',
                                opacity: 0.75
                              }}></span>
                              <span style={{
                                fontSize: '13px',
                                fontWeight: 600,
                                color: 'hsl(var(--foreground))',
                                fontFamily: 'Montserrat, sans-serif'
                              }}>
                                Requirement: {requiredFormatted.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                    labelStyle={{ 
                      fontWeight: 600, 
                      marginBottom: '8px',
                      color: 'hsl(var(--foreground))',
                      fontSize: '13px',
                      fontFamily: 'Montserrat, sans-serif'
                    }}
                    separator=": "
                  />
                  <Legend 
                    wrapperStyle={{ 
                      paddingTop: '10px',
                      paddingBottom: '5px'
                    }}
                    iconType="rect"
                    iconSize={16}
                    formatter={(value, entry: any) => {
                      // Color the legend text based on fruit type
                      const textColor = fruit === 'BANANAS' 
                        ? 'hsl(45, 90%, 50%)' // Gold for bananas
                        : 'hsl(18, 85%, 55%)'; // Coral for pineapples
                      
                      // Requirement stays teal, Delivered matches fruit
                      const finalColor = value === 'Requirement' 
                        ? 'hsl(190, 100%, 25%)' 
                        : textColor;
                      
                      return (
                        <span style={{ 
                          fontSize: '13px', 
                          fontWeight: 600,
                          color: finalColor,
                          fontFamily: 'Montserrat, sans-serif'
                        }}>
                          {value}
                        </span>
                      );
                    }}
                  />
                  {/* Requirement Bar - Primary Teal (same as sidebar) */}
                  <Bar 
                    dataKey="required" 
                    fill="hsl(190, 100%, 25%)" 
                    name="Requirement"
                    radius={[6, 6, 0, 0]}
                    opacity={0.75}
                    stroke="hsl(190, 100%, 20%)"
                    strokeWidth={1.5}
                  />
                  {/* Delivered Bar - Gold for bananas (same as line chart), Accent for pineapples */}
                  <Bar 
                    dataKey="achieved" 
                    name="Delivered"
                    fill={fruit === 'BANANAS' ? 'hsl(45, 90%, 50%)' : 'hsl(18, 85%, 55%)'}
                    radius={[6, 6, 0, 0]}
                    strokeWidth={2.5}
                  >
                    {packContainers.map((entry, index) => {
                      // Use exact same colors as line chart and sidebar
                      const baseColor = fruit === 'BANANAS' 
                        ? 'hsl(45, 90%, 50%)' // Same gold as line chart
                        : 'hsl(18, 85%, 55%)'; // Same accent/coral as line chart
                      
                      const strokeColor = fruit === 'BANANAS' 
                        ? 'hsl(45, 85%, 45%)' 
                        : 'hsl(18, 75%, 50%)';
                      
                      return (
                        <Cell 
                          key={`cell-${index}`}
                          fill={baseColor}
                          stroke={strokeColor}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {/* Weekly Shipment Trend */}
      <section className="mb-6">
        <div className="bg-card rounded-lg p-6 shadow-sm border border-border animate-fade-in">
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
                  stroke={fruit === 'BANANAS' ? 'hsl(var(--gold))' : 'hsl(var(--accent))'} 
                  strokeWidth={3}
                  dot={{ fill: fruit === 'BANANAS' ? 'hsl(var(--gold))' : 'hsl(var(--accent))', r: 4 }}
                  activeDot={{ r: 6 }}
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

