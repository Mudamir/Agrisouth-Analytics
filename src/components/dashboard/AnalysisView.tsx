import { useMemo, useState } from 'react';
import { ShippingRecord, FruitType } from '@/types/shipping';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface AnalysisViewProps {
  data: ShippingRecord[];
}

const COLORS = ['hsl(190, 100%, 25%)', 'hsl(18, 85%, 55%)', 'hsl(45, 90%, 50%)', 'hsl(190, 60%, 35%)', 'hsl(18, 70%, 65%)', 'hsl(200, 60%, 15%)'];

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
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">ANALYSIS</h1>
          <p className="text-muted-foreground">Aggregate views and insights</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(v === 'ALL' ? 'ALL' : parseInt(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Years</SelectItem>
              {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          
          <Select value={String(selectedWeek)} onValueChange={(v) => setSelectedWeek(v === 'ALL' ? 'ALL' : parseInt(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Weeks</SelectItem>
              {weeks.map(w => <SelectItem key={w} value={String(w)}>Week {w}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={selectedItem} onValueChange={(v) => setSelectedItem(v as FruitType | 'ALL')}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Items</SelectItem>
              <SelectItem value="BANANAS">Bananas</SelectItem>
              <SelectItem value="PINEAPPLES">Pineapples</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <p className="stat-card-label">Total Cartons</p>
          <p className="stat-card-value">{totalCartons.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="stat-card-label">Total Containers</p>
          <p className="stat-card-value">{totalContainers.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="stat-card-label">Unique Packs</p>
          <p className="stat-card-value">{packAnalysis.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-card-label">Records</p>
          <p className="stat-card-value">{filteredData.length.toLocaleString()}</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cartons by Pack */}
        <div className="bg-card rounded-lg p-4 shadow-sm border border-border">
          <h3 className="font-heading font-semibold text-foreground mb-4">Cartons by Pack Type</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={packAnalysis} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={75} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [value.toLocaleString(), 'Cartons']}
              />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Supplier Distribution */}
        <div className="bg-card rounded-lg p-4 shadow-sm border border-border">
          <h3 className="font-heading font-semibold text-foreground mb-4">Top Suppliers</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={supplierAnalysis}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
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
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [value.toLocaleString(), 'Cartons']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Trend */}
        <div className="bg-card rounded-lg p-4 shadow-sm border border-border lg:col-span-2">
          <h3 className="font-heading font-semibold text-foreground mb-4">Weekly Shipment Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number, name: string) => [value.toLocaleString(), name]}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="bananas" 
                stroke="hsl(var(--gold))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--gold))' }}
                name="Bananas"
              />
              <Line 
                type="monotone" 
                dataKey="pineapples" 
                stroke="hsl(var(--accent))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--accent))' }}
                name="Pineapples"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
