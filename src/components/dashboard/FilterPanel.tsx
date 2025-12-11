import { FilterState } from '@/types/shipping';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface FilterPanelProps {
  filters: FilterState;
  years: number[];
  weeks: number[];
  suppliers: string[];
  sLines: string[];
  pols: string[];
  destinations: string[];
  onUpdateFilter: (key: keyof FilterState, value: any) => void;
  onToggleArrayFilter: (key: 'weeks' | 'suppliers' | 'sLines' | 'pols' | 'destinations', value: string | number) => void;
  onClearFilters: () => void;
}

export function FilterPanel({
  filters,
  years,
  weeks,
  suppliers,
  sLines,
  pols,
  destinations,
  onUpdateFilter,
  onToggleArrayFilter,
  onClearFilters,
}: FilterPanelProps) {
  const hasActiveFilters = filters.weeks.length > 0 || filters.suppliers.length > 0 || filters.sLines.length > 0 || filters.pols.length > 0 || filters.destinations.length > 0;

  return (
    <aside className="w-52 bg-background border-l border-border p-3 space-y-4 overflow-y-auto">
      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-destructive/10 text-destructive rounded-lg text-sm font-medium hover:bg-destructive/20 transition-colors"
        >
          <X className="w-4 h-4" />
          Clear Filters
        </button>
      )}

      {/* Year Filter */}
      <div className="filter-panel">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm font-heading">Year</h3>
          {filters.year !== null && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onUpdateFilter('year', null)}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Clear year filter"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
        <div className="space-y-1">
          {years.map(year => (
            <button
              key={year}
              onClick={() => onUpdateFilter('year', year)}
              className={cn(
                'w-full text-left px-3 py-1.5 rounded text-sm transition-colors',
                filters.year === year
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/70'
              )}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {/* Week Filter */}
      <div className="filter-panel">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm font-heading">WEEK</h3>
          {filters.weeks.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onUpdateFilter('weeks', [])}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Clear week filters"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
        <ScrollArea className="h-40">
          <div className="grid grid-cols-2 gap-1">
            {weeks.slice(0, 52).map(week => (
              <button
                key={week}
                onClick={() => onToggleArrayFilter('weeks', week)}
                className={cn(
                  'px-2 py-1 rounded text-xs transition-colors',
                  filters.weeks.includes(week)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/70'
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
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm font-heading">SUPPLIERS</h3>
          {filters.suppliers.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onUpdateFilter('suppliers', [])}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Clear supplier filters"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
        <ScrollArea className="h-40">
          <div className="space-y-1">
            {suppliers.map(supplier => (
              <button
                key={supplier}
                onClick={() => onToggleArrayFilter('suppliers', supplier)}
                className={cn(
                  'w-full text-left px-2 py-1.5 rounded text-xs transition-colors truncate',
                  filters.suppliers.includes(supplier)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/70'
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
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm font-heading">S.LINE</h3>
          {filters.sLines.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onUpdateFilter('sLines', [])}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Clear S.Line filters"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1">
          {sLines.map(sLine => (
            <button
              key={sLine}
              onClick={() => onToggleArrayFilter('sLines', sLine)}
              className={cn(
                'px-2 py-1.5 rounded text-xs transition-colors',
                filters.sLines.includes(sLine)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/70'
              )}
            >
              {sLine}
            </button>
          ))}
        </div>
      </div>

      {/* POL Filter */}
      <div className="filter-panel">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm font-heading">POL</h3>
          {filters.pols.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onUpdateFilter('pols', [])}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Clear POL filters"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
        <div className="space-y-1">
          {pols.map(pol => (
            <button
              key={pol}
              onClick={() => onToggleArrayFilter('pols', pol)}
              className={cn(
                'w-full text-left px-2 py-1.5 rounded text-xs transition-colors',
                filters.pols.includes(pol)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/70'
              )}
            >
              {pol}
            </button>
          ))}
        </div>
      </div>

      {/* Destination Filter */}
      <div className="filter-panel">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm font-heading">DESTINATION</h3>
          {filters.destinations.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onUpdateFilter('destinations', [])}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Clear destination filters"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
        <ScrollArea className="h-40">
          <div className="space-y-1">
            {destinations.map(destination => (
              <button
                key={destination}
                onClick={() => onToggleArrayFilter('destinations', destination)}
                className={cn(
                  'w-full text-left px-2 py-1.5 rounded text-xs transition-colors truncate',
                  filters.destinations.includes(destination)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/70'
                )}
              >
                {destination}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>
    </aside>
  );
}
