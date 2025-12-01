import { PackStats } from '@/types/shipping';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { BarChart3 } from 'lucide-react';

interface PackChartProps {
  data: PackStats[];
}

export function PackChart({ data }: PackChartProps) {
  const chartData = data.map(item => ({
    name: item.pack.replace(' KG ', '\nKG '),
    Containers: item.containers,
    Cartons: Math.round(item.cartons / 1000),
  }));

  return (
    <div className="chart-container opacity-0 animate-fade-in" style={{ animationDelay: '100ms' }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <BarChart3 className="w-4 h-4 text-primary" />
        </div>
        <h3 className="font-heading font-semibold text-foreground">Pack Distribution</h3>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <defs>
            <linearGradient id="containerGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(168, 80%, 40%)" />
              <stop offset="100%" stopColor="hsl(168, 80%, 30%)" />
            </linearGradient>
            <linearGradient id="cartonGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(24, 95%, 58%)" />
              <stop offset="100%" stopColor="hsl(24, 95%, 48%)" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 92%)" vertical={false} />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 11, fill: 'hsl(220, 15%, 45%)', fontFamily: 'Inter' }}
            angle={-45}
            textAnchor="end"
            height={80}
            axisLine={{ stroke: 'hsl(220, 20%, 90%)' }}
            tickLine={{ stroke: 'hsl(220, 20%, 90%)' }}
          />
          <YAxis 
            tick={{ fontSize: 11, fill: 'hsl(220, 15%, 45%)', fontFamily: 'Inter' }}
            axisLine={{ stroke: 'hsl(220, 20%, 90%)' }}
            tickLine={{ stroke: 'hsl(220, 20%, 90%)' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(0, 0%, 100%)',
              border: '1px solid hsl(220, 20%, 90%)',
              borderRadius: '12px',
              fontFamily: 'Inter',
              boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)',
              padding: '12px 16px',
            }}
            formatter={(value: number, name: string) => [
              name === 'Cartons' ? `${value}K cartons` : `${value} containers`,
              name,
            ]}
            cursor={{ fill: 'hsl(168, 80%, 36%, 0.05)' }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={(value) => <span style={{ color: 'hsl(220, 30%, 20%)', fontFamily: 'Inter', fontSize: '12px' }}>{value}</span>}
          />
          <Bar 
            dataKey="Containers" 
            fill="url(#containerGradient)"
            radius={[6, 6, 0, 0]}
            name="Containers"
          />
          <Bar 
            dataKey="Cartons" 
            fill="url(#cartonGradient)"
            radius={[6, 6, 0, 0]}
            name="Cartons (K)"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
