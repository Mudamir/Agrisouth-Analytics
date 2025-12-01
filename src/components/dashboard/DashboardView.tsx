import { FruitType, PackStats } from '@/types/shipping';
import { StatCard } from './StatCard';
import { PackChart } from './PackChart';

interface DashboardViewProps {
  fruit: FruitType;
  packStats: PackStats[];
  totalStats: { containers: number; cartons: number };
  supplierStats: { supplier: string; containers: number; cartons: number }[];
}

export function DashboardView({ fruit, packStats, totalStats, supplierStats }: DashboardViewProps) {
  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal to-secondary flex items-center justify-center shadow-elevated overflow-hidden">
          <span className="text-4xl">
            {fruit === 'BANANAS' ? '🌳' : '🍍'}
          </span>
        </div>
        <div>
          <h1 className="text-xl font-bold font-heading text-foreground">
            AGSouth Fruits Pacific Branch Office
          </h1>
          <p className="page-title">{fruit}</p>
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
              className="animate-fade-in"
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
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` } as React.CSSProperties}
            />
          ))}
        </div>
      </section>

      {/* Supplier Stats */}
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

      {/* Chart */}
      <section className="mb-6">
        <PackChart data={packStats} />
      </section>

      {/* Totals */}
      <section className="grid grid-cols-2 gap-4">
        <div className="stat-card">
          <p className="stat-card-label">Total Number of Containers Shipped</p>
          <p className="stat-card-value text-3xl">{totalStats.containers.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="stat-card-label">Total Number of Cartons Shipped</p>
          <p className="stat-card-value text-3xl">{totalStats.cartons.toLocaleString()}</p>
        </div>
      </section>
    </div>
  );
}
