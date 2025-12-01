import { PackStats } from '@/types/shipping';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';

interface PackChartProps {
  data: PackStats[];
}

export function PackChart({ data }: PackChartProps) {
  const chartData = data.map(item => ({
    name: item.pack.replace(' KG ', '\nKG '),
    Containers: item.containers,
    Cartons: Math.round(item.cartons / 1000), // Show in thousands for better visualization
  }));

  return (
    <div className="bg-card rounded-lg p-4 shadow-sm border border-border animate-fade-in">
      <h3 className="font-heading font-semibold text-foreground mb-4">Pack Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontFamily: 'Open Sans',
            }}
            formatter={(value: number, name: string) => [
              name === 'Cartons' ? `${value}K cartons` : `${value} containers`,
              name,
            ]}
          />
          <Legend />
          <Bar 
            dataKey="Containers" 
            fill="hsl(var(--primary))" 
            radius={[4, 4, 0, 0]}
            name="Containers"
          />
          <Bar 
            dataKey="Cartons" 
            fill="hsl(var(--accent))" 
            radius={[4, 4, 0, 0]}
            name="Cartons (K)"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
