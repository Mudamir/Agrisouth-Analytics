import { FruitType, PackStats } from '@/types/shipping';
import { StatCard } from './StatCard';
import { PackChart } from './PackChart';
import { Package, Boxes, TrendingUp } from 'lucide-react';

interface DashboardViewProps {
  fruit: FruitType;
  packStats: PackStats[];
  totalStats: { containers: number; cartons: number };
  supplierStats: { supplier: string; containers: number; cartons: number }[];
}

export function DashboardView({ fruit, packStats, totalStats, supplierStats }: DashboardViewProps) {
  return (
    <div className="flex-1 p-8 overflow-y-auto bg-background">
      {/* Header */}
      <header className="flex items-center gap-6 mb-8 animate-fade-in">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-lg border border-primary/10">
            <span className="text-5xl animate-float">
              {fruit === 'BANANAS' ? '🍌' : '🍍'}
            </span>
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-accent flex items-center justify-center shadow-lg">
            <TrendingUp className="w-3 h-3 text-accent-foreground" />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground tracking-wide">AGSouth Fruits Pacific</p>
          <h1 className="page-title">{fruit}</h1>
        </div>
      </header>

      {/* Container Stats */}
      <section className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-sm font-semibold text-foreground font-heading">
            Containers by Pack
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {packStats.map((stat, index) => (
            <StatCard
              key={stat.pack}
              label={stat.pack}
              value={stat.containers}
              className="opacity-0 animate-fade-in"
              style={{ animationDelay: `${index * 80}ms` }}
            />
          ))}
        </div>
      </section>

      {/* Carton Stats */}
      <section className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <Boxes className="w-4 h-4 text-accent" />
          </div>
          <h2 className="text-sm font-semibold text-foreground font-heading">
            Cartons by Pack
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {packStats.map((stat, index) => (
            <div 
              key={`cartons-${stat.pack}`}
              className="metric-card opacity-0 animate-fade-in"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.pack}</p>
              <p className="text-2xl font-bold font-heading text-foreground mt-2">
                {stat.cartons.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Supplier Stats */}
      {supplierStats.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-light/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-light" />
            </div>
            <h2 className="text-sm font-semibold text-foreground font-heading">
              Top Suppliers
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {supplierStats.slice(0, 8).map((stat, index) => (
              <div 
                key={stat.supplier} 
                className="supplier-card opacity-0 animate-fade-in"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl bg-gradient-to-b from-primary to-primary/50" />
                <p className="text-xs font-medium text-muted-foreground truncate pl-2">{stat.supplier}</p>
                <div className="flex items-baseline gap-2 mt-2 pl-2">
                  <p className="text-xl font-bold font-heading text-foreground">
                    {stat.containers.toLocaleString()}
                  </p>
                  <span className="text-xs text-muted-foreground">containers</span>
                </div>
                <p className="text-sm font-semibold text-accent mt-1 pl-2">
                  {stat.cartons.toLocaleString()} cartons
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Chart */}
      <section className="mb-8">
        <PackChart data={packStats} />
      </section>

      {/* Totals */}
      <section className="grid grid-cols-2 gap-6">
        <div className="total-card opacity-0 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-5 h-5 text-primary-foreground/80" />
              <p className="text-xs font-medium uppercase tracking-wider text-primary-foreground/70">Total Containers</p>
            </div>
            <p className="text-4xl font-bold font-heading text-primary-foreground">{totalStats.containers.toLocaleString()}</p>
          </div>
        </div>
        <div className="total-card opacity-0 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Boxes className="w-5 h-5 text-primary-foreground/80" />
              <p className="text-xs font-medium uppercase tracking-wider text-primary-foreground/70">Total Cartons</p>
            </div>
            <p className="text-4xl font-bold font-heading text-primary-foreground">{totalStats.cartons.toLocaleString()}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
