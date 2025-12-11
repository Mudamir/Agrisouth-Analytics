import { cn } from '@/lib/utils';
import { CSSProperties } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SupplierCardProps {
  supplier: string;
  cartons: number;
  containers: number;
  packBreakdown?: { pack: string; cartons: number; containers: number }[];
  className?: string;
  style?: CSSProperties;
}

export function SupplierCard({ 
  supplier, 
  cartons, 
  containers, 
  packBreakdown = [],
  className,
  style 
}: SupplierCardProps) {
  return (
    <div 
      className={cn(
        'bg-card border border-border rounded-lg p-2.5 shadow-sm hover:shadow-md transition-all duration-200 animate-fade-in group',
        'hover:border-primary/30 flex flex-col h-full',
        className
      )}
      style={style}
    >
      {/* Header - Supplier Name */}
      <div className="mb-2.5 pb-2 border-b border-border/60">
        <h3 className="font-heading font-bold text-foreground text-sm truncate group-hover:text-primary transition-colors">
          {supplier}
        </h3>
      </div>

      {/* Main Stats - Prominent & Readable */}
      <div className="grid grid-cols-2 gap-3 mb-3 pb-2.5 border-b border-border/60">
        <div className="bg-muted/40 rounded px-2 py-1.5 border border-border/30">
          <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
            Cartons
          </div>
          <div className="text-lg font-bold text-foreground font-mono tabular-nums">
            {cartons.toLocaleString()}
          </div>
        </div>
        <div className="bg-muted/40 rounded px-2 py-1.5 border border-border/30">
          <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
            Containers
          </div>
          <div className="text-lg font-bold text-foreground font-mono tabular-nums">
            {containers.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Pack Breakdown - Clean Table */}
      {packBreakdown.length > 0 && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="mb-1.5">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
              Pack Breakdown
            </p>
          </div>
          <ScrollArea className="flex-1 pr-1">
            {/* Table Header */}
            <div className="grid grid-cols-[1.5fr_1fr_1fr] gap-2 items-center py-1 px-1.5 mb-1 bg-muted/30 rounded border border-border/20">
              <div className="min-w-0">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">Pack</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">Cartons</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">Containers</span>
              </div>
            </div>
            
            {/* Table Rows */}
            <div className="space-y-0.5">
              {packBreakdown.map((pack, index) => (
                <div 
                  key={pack.pack}
                  className="grid grid-cols-[1.5fr_1fr_1fr] gap-2 items-center py-1 px-1.5 rounded border border-border/20 hover:border-primary/50 hover:bg-muted/30 transition-all bg-background/50"
                  style={{ animationDelay: `${index * 15}ms` } as CSSProperties}
                >
                  {/* Pack Name */}
                  <div className="min-w-0">
                    <span className="font-semibold text-[11px] text-foreground truncate block leading-tight">
                      {pack.pack}
                    </span>
                  </div>
                  
                  {/* Cartons - Right Aligned, Monospace */}
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-foreground font-mono tabular-nums">
                      {pack.cartons.toLocaleString()}
                    </span>
                  </div>
                  
                  {/* Containers - Right Aligned, Monospace */}
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-primary font-mono tabular-nums">
                      {pack.containers.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

