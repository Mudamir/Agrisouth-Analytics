import { useMemo, useState } from 'react';
import { ShippingRecord, FruitType } from '@/types/shipping';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Package, Boxes, Users, Calendar } from 'lucide-react';

interface AnalysisViewProps {
  data: ShippingRecord[];
}

const COLORS = ['hsl(168, 80%, 36%)', 'hsl(24, 95%, 53%)', 'hsl(45, 93%, 47%)', 'hsl(168, 60%, 45%)', 'hsl(24, 90%, 65%)', 'hsl(220, 30%, 20%)'];

export function AnalysisView({ data }: AnalysisViewProps) {
  const [selectedYear, setSelectedYear] = useState<number | 'ALL'>('ALL');
  const [selectedItem, setSelectedItem] = useState<FruitType | 'ALL'>('ALL');
  const [selectedWeek, setSelectedWeek] = useState<number | 'ALL'>('ALL');

  const years = useMemo(() => [...new Set(data.map(r => r.year))].sort((a, b) => b - a), [data]);
  const weeks = useMemo(() => [...new Set(data.map(r => r.week))].sort((a, b) => a - b), [data]);

  const filteredData = useMemo(() => {
    return data.filter(r => {
      if (selectedYear !== 'ALL' && r.year !== selectedYear) return false;
      if (selectedItem !== 'ALL' && r.item !== selectedItem) return false;
      if (selectedWeek !== 'ALL' && r.week !== selectedWeek) return false;
      return true;
    });
  }, [data, selectedYear, selectedItem, selectedWeek]);

  const packAnalysis = useMemo(() => {
    const packMap = new Map<string, number>();
    filteredData.forEach(r => {
      packMap.set(r.pack, (packMap.get(r.pack) || 0) + r.cartons);
    });
    return Array.from(packMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const weeklyTrend = useMemo(() => {
    const weekMap = new Map<number, { bananas: number; pineapples: number }>();
    filteredData.forEach(r => {
      const current = weekMap.get(r.week) || { bananas: 0, pineapples: 0 };
      if (r.item === 'BANANAS') {
        current.bananas += r.cartons;
      } else {
        current.pineapples += r.cartons;
      }
      weekMap.set(r.week, current);
    });
    return Array.from(weekMap.entries())
      .map(([week, data]) => ({ week: `W${week}`, ...data }))
      .sort((a, b) => parseInt(a.week.slice(1)) - parseInt(b.week.slice(1)));
  }, [filteredData]);

  const supplierAnalysis = useMemo(() => {
    const supplierMap = new Map<string, number>();
    filteredData.forEach(r => {
      supplierMap.set(r.supplier, (supplierMap.get(r.supplier) || 0) + r.cartons);
    });
    return Array.from(supplierMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredData]);

  const totalCartons = filteredData.reduce((sum, r) => sum + r.cartons, 0);
  const totalContainers = filteredData.reduce((sum, r) => sum + r.lCont, 0);

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-background">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <p className="text-sm font-medium text-muted-foreground tracking-wide">Insights & Metrics</p>
          <h1 className="page-title">Analysis</h1>
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(v === 'ALL' ? 'ALL' : parseInt(v))}>
            <SelectTrigger className="w-32 bg-card border-border/50">
              <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Years</SelectItem>
              {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          
          <Select value={String(selectedWeek)} onValueChange={(v) => setSelectedWeek(v === 'ALL' ? 'ALL' : parseInt(v))}>
            <SelectTrigger className="w-32 bg-card border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Weeks</SelectItem>
              {weeks.map(w => <SelectItem key={w} value={String(w)}>Week {w}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={selectedItem} onValueChange={(v) => setSelectedItem(v as FruitType | 'ALL')}>
            <SelectTrigger className="w-40 bg-card border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Items</SelectItem>
              <SelectItem value="BANANAS">🍌 Bananas</SelectItem>
              <SelectItem value="PINEAPPLES">🍍 Pineapples</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="stat-card opacity-0 animate-fade-in" style={{ animationDelay: '0ms' }}>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Boxes className="w-4 h-4 text-primary-foreground/70" />
              <p className="stat-card-label">Total Cartons</p>
            </div>
            <p className="stat-card-value">{totalCartons.toLocaleString()}</p>
          </div>
        </div>
        <div className="stat-card opacity-0 animate-fade-in" style={{ animationDelay: '80ms' }}>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-primary-foreground/70" />
              <p className="stat-card-label">Total Containers</p>
            </div>
            <p className="stat-card-value">{totalContainers.toLocaleString()}</p>
          </div>
        </div>
        <div className="stat-card opacity-0 animate-fade-in" style={{ animationDelay: '160ms' }}>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary-foreground/70" />
              <p className="stat-card-label">Unique Packs</p>
            </div>
            <p className="stat-card-value">{packAnalysis.length}</p>
          </div>
        </div>
        <div className="stat-card opacity-0 animate-fade-in" style={{ animationDelay: '240ms' }}>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-primary-foreground/70" />
              <p className="stat-card-label">Records</p>
            </div>
            <p className="stat-card-value">{filteredData.length.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cartons by Pack */}
        <div className="chart-container opacity-0 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Boxes className="w-4 h-4 text-primary" />
            </div>
            <h3 className="font-heading font-semibold text-foreground">Cartons by Pack Type</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={packAnalysis} layout="vertical" margin={{ left: 80 }}>
              <defs>
                <linearGradient id="packGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(168, 80%, 36%)" />
                  <stop offset="100%" stopColor="hsl(168, 80%, 28%)" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 92%)" horizontal={true} vertical={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(220, 15%, 45%)' }} axisLine={{ stroke: 'hsl(220, 20%, 90%)' }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'hsl(220, 15%, 45%)' }} width={75} axisLine={{ stroke: 'hsl(220, 20%, 90%)' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(0, 0%, 100%)',
                  border: '1px solid hsl(220, 20%, 90%)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)',
                }}
                formatter={(value: number) => [value.toLocaleString(), 'Cartons']}
              />
              <Bar dataKey="value" fill="url(#packGradient)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Supplier Distribution */}
        <div className="chart-container opacity-0 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-accent" />
            </div>
            <h3 className="font-heading font-semibold text-foreground">Top Suppliers</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={supplierAnalysis}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={105}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {supplierAnalysis.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(0, 0%, 100%)',
                  border: '1px solid hsl(220, 20%, 90%)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)',
                }}
                formatter={(value: number) => [value.toLocaleString(), 'Cartons']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Trend */}
        <div className="chart-container lg:col-span-2 opacity-0 animate-fade-in" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gold/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-gold" />
            </div>
            <h3 className="font-heading font-semibold text-foreground">Weekly Shipment Trend</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 92%)" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'hsl(220, 15%, 45%)' }} axisLine={{ stroke: 'hsl(220, 20%, 90%)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(220, 15%, 45%)' }} axisLine={{ stroke: 'hsl(220, 20%, 90%)' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(0, 0%, 100%)',
                  border: '1px solid hsl(220, 20%, 90%)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)',
                }}
                formatter={(value: number, name: string) => [value.toLocaleString(), name]}
              />
              <Legend 
                formatter={(value) => <span style={{ color: 'hsl(220, 30%, 20%)', fontFamily: 'Inter', fontSize: '12px' }}>{value}</span>}
              />
              <Line 
                type="monotone" 
                dataKey="bananas" 
                stroke="hsl(45, 93%, 47%)" 
                strokeWidth={3}
                dot={{ fill: 'hsl(45, 93%, 47%)', strokeWidth: 2 }}
                name="Bananas"
              />
              <Line 
                type="monotone" 
                dataKey="pineapples" 
                stroke="hsl(24, 95%, 53%)" 
                strokeWidth={3}
                dot={{ fill: 'hsl(24, 95%, 53%)', strokeWidth: 2 }}
                name="Pineapples"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
