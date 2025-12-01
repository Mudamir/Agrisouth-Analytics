import { FilterState } from '@/types/shipping';
import { cn } from '@/lib/utils';
import { SlidersHorizontal, X, Calendar, Users, Ship, MapPin } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FilterPanelProps {
  filters: FilterState;
  years: number[];
  weeks: number[];
  suppliers: string[];
  sLines: string[];
  pols: string[];
  onUpdateFilter: (key: keyof FilterState, value: any) => void;
  onToggleArrayFilter: (key: 'weeks' | 'suppliers' | 'sLines' | 'pols', value: string | number) => void;
  onClearFilters: () => void;
}

export function FilterPanel({
  filters,
  years,
  weeks,
  suppliers,
  sLines,
  pols,
  onUpdateFilter,
  onToggleArrayFilter,
  onClearFilters,
}: FilterPanelProps) {
  const hasActiveFilters = filters.weeks.length > 0 || filters.suppliers.length > 0 || filters.sLines.length > 0 || filters.pols.length > 0;

  return (
    <aside className="w-56 bg-card/50 backdrop-blur-sm border-l border-border/50 p-4 space-y-4 overflow-y-auto animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center gap-2 px-1 pb-2 border-b border-border/50">
        <SlidersHorizontal className="w-4 h-4 text-primary" />
        <h2 className="font-heading font-semibold text-sm text-foreground">Filters</h2>
      </div>

      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-destructive/10 text-destructive rounded-xl text-sm font-medium hover:bg-destructive/15 transition-all duration-200"
        >
          <X className="w-4 h-4" />
          Clear All
        </button>
      )}

      {/* Year Filter */}
      <div className="filter-panel">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-xs font-heading uppercase tracking-wider text-muted-foreground">Year</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {years.map(year => (
            <button
              key={year}
              onClick={() => onUpdateFilter('year', year)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                filters.year === year
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {/* Week Filter */}
      <div className="filter-panel">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-xs font-heading uppercase tracking-wider text-muted-foreground">Week</h3>
        </div>
        <ScrollArea className="h-36">
          <div className="grid grid-cols-4 gap-1.5 pr-2">
            {weeks.slice(0, 52).map(week => (
              <button
                key={week}
                onClick={() => onToggleArrayFilter('weeks', week)}
                className={cn(
                  'px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                  filters.weeks.includes(week)
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/30 text-muted-foreground hover:bg-muted/60'
                )}
              >
                {week}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Suppliers Filter */}
      <div className="filter-panel">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-xs font-heading uppercase tracking-wider text-muted-foreground">Suppliers</h3>
        </div>
        <ScrollArea className="h-36">
          <div className="space-y-1.5 pr-2">
            {suppliers.map(supplier => (
              <button
                key={supplier}
                onClick={() => onToggleArrayFilter('suppliers', supplier)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 truncate',
                  filters.suppliers.includes(supplier)
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )}
              >
                {supplier}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* S.LINE Filter */}
      <div className="filter-panel">
        <div className="flex items-center gap-2 mb-3">
          <Ship className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-xs font-heading uppercase tracking-wider text-muted-foreground">Shipping Line</h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sLines.map(sLine => (
            <button
              key={sLine}
              onClick={() => onToggleArrayFilter('sLines', sLine)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                filters.sLines.includes(sLine)
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
            >
              {sLine}
            </button>
          ))}
        </div>
      </div>

      {/* POL Filter */}
      <div className="filter-panel">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-xs font-heading uppercase tracking-wider text-muted-foreground">Port of Loading</h3>
        </div>
        <div className="space-y-1.5">
          {pols.map(pol => (
            <button
              key={pol}
              onClick={() => onToggleArrayFilter('pols', pol)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200',
                filters.pols.includes(pol)
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
            >
              {pol}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}