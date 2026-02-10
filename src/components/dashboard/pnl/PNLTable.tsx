import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { SupplierData, PackData } from '../PNLView';

interface PNLTableProps {
  title: string;
  packs: PackData[];
  suppliers: string[];
  grandTotals: SupplierData;
  type: 'cartons' | 'sales' | 'purchase' | 'profit';
  formatValue: (value: number, supplier?: string) => string;
  selectedCell?: { pack: string; supplier: string } | null;
  onCellClick?: (cell: { pack: string; supplier: string } | null) => void;
}

export function PNLTable({ 
  title, 
  packs, 
  suppliers, 
  grandTotals, 
  type,
  formatValue,
  selectedCell,
  onCellClick
}: PNLTableProps) {
  const isProfit = type === 'profit';
  const showTotals = type !== 'cartons';

  // Format value helper - shows "-" for zero values
  const formatDisplayValue = (value: number) => {
    if (value === 0) {
      return '-';
    }
    return formatValue(value);
  };

  // Check if a cell is selected
  const isCellSelected = (pack: string, supplier: string) => {
    if (!selectedCell) return false;
    
    // Handle specific cell selection
    return selectedCell.pack === pack && selectedCell.supplier === supplier;
  };

  // Check if pack header should be highlighted
  const isPackHighlighted = (pack: string) => {
    return selectedCell?.pack === pack;
  };

  // Check if supplier column header should be highlighted
  const isSupplierHighlighted = (supplier: string) => {
    return selectedCell?.supplier === supplier;
  };

  // Check if total row should be highlighted
  const isTotalRowHighlighted = () => {
    return selectedCell?.pack === 'TOTAL';
  };

  // Handle cell click
  const handleCellClick = (pack: string, supplier: string) => {
    if (!onCellClick) return;
    
    // Toggle selection - if clicking the same cell, deselect it
    if (isCellSelected(pack, supplier)) {
      onCellClick(null);
    } else {
      onCellClick({ pack, supplier });
    }
  };


  return (
    <div className="bg-gradient-to-br from-card to-card/50 rounded-xl border border-border/60 shadow-lg overflow-hidden">
      {/* Elegant Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50 bg-gradient-to-r from-muted/40 via-muted/30 to-muted/40 backdrop-blur-sm">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">{title}</h3>
        {type === 'profit' && grandTotals.profit !== 0 && (
          <span className={cn(
            "text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm",
            grandTotals.profit >= 0 
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
              : "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20"
          )}>
            {grandTotals.profit >= 0 ? '↑' : '↓'} {formatDisplayValue(grandTotals.profit)}
          </span>
        )}
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-muted/50 via-muted/40 to-muted/50 border-b-2 border-border/60 h-10">
              <TableHead className="w-28 font-bold text-xs py-3 px-4 bg-gradient-to-r from-muted/60 to-muted/50 sticky left-0 z-20 border-r border-border/60 shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                <span className="text-xs">Pack</span>
              </TableHead>
              {suppliers.map(supplier => {
                const isHighlighted = isSupplierHighlighted(supplier);
                return (
                  <TableHead 
                    key={supplier} 
                    className={cn(
                      "text-right font-bold min-w-[100px] text-xs py-3 px-3 whitespace-nowrap transition-all duration-200",
                      isHighlighted 
                        ? "bg-primary/25 ring-2 ring-primary/30 text-primary" 
                        : "text-foreground/80"
                    )}
                  >
                    <span className="text-xs">{supplier}</span>
                  </TableHead>
                );
              })}
              <TableHead className="text-right font-bold min-w-[100px] text-xs py-3 px-3 whitespace-nowrap bg-gradient-to-r from-muted/70 to-muted/60 border-l-2 border-border/60">
                <span className="text-xs">Total</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {packs.map((pack) => {
              const packIsHighlighted = isPackHighlighted(pack.pack);
              
              return (
                <TableRow 
                  key={pack.pack} 
                  className={cn(
                    "hover:bg-muted/30 border-b border-border/40 transition-all duration-200 group",
                    packIsHighlighted && "bg-primary/8"
                  )}
                >
                  <TableCell className={cn(
                    "font-bold text-xs py-3 px-4 bg-gradient-to-r from-muted/40 to-muted/30 border-r border-border/60 sticky left-0 z-10 transition-all duration-200 shadow-[2px_0_4px_rgba(0,0,0,0.05)]",
                    packIsHighlighted && "bg-primary/15 text-primary"
                  )}>
                    {pack.pack}
                  </TableCell>
                {suppliers.map(supplier => {
                  const value = pack.suppliers[supplier]?.[type] || 0;
                  const isSelected = isCellSelected(pack.pack, supplier);
                  
                  return (
                    <TableCell
                      key={supplier}
                      onClick={() => handleCellClick(pack.pack, supplier)}
                      className={cn(
                        'text-right text-xs py-3 px-3 font-semibold cursor-pointer transition-all duration-200 whitespace-nowrap',
                        'hover:bg-primary/12 hover:scale-[1.02]',
                        isSelected && 'bg-primary/25 ring-2 ring-primary/40 font-bold shadow-sm',
                        isProfit && value !== 0 && (
                          value >= 0 
                            ? 'text-emerald-700 dark:text-emerald-400' 
                            : 'text-red-700 dark:text-red-400'
                        ),
                        !isProfit && isSelected && 'text-primary',
                        !isProfit && !isSelected && 'text-foreground/90'
                      )}
                      title={`${pack.pack} - ${supplier}: ${formatDisplayValue(value)}`}
                    >
                      {isProfit && value !== 0 && (
                        <span className="mr-1.5 font-bold">{value >= 0 ? '↑' : '↓'}</span>
                      )}
                      {formatDisplayValue(value)}
                    </TableCell>
                  );
                })}
                <TableCell className={cn(
                  'text-right text-xs py-3 px-3 font-bold whitespace-nowrap bg-gradient-to-r from-muted/50 to-muted/40 border-l-2 border-border/60',
                  isProfit && pack.totals[type] !== 0 && (
                    pack.totals[type] >= 0 
                      ? 'text-emerald-700 dark:text-emerald-400' 
                      : 'text-red-700 dark:text-red-400'
                  )
                )}>
                  {isProfit && pack.totals[type] !== 0 && (
                    <span className="mr-1.5 font-bold">{pack.totals[type] >= 0 ? '↑' : '↓'}</span>
                  )}
                  {formatDisplayValue(pack.totals[type])}
                </TableCell>
              </TableRow>
              );
            })}
            <TableRow className={cn(
              "bg-gradient-to-r from-muted/70 via-muted/60 to-muted/70 font-bold border-t-2 border-border/60 transition-all duration-200",
              isTotalRowHighlighted() && "bg-primary/10"
            )}>
              <TableCell className={cn(
                "font-bold text-xs py-3.5 px-4 bg-gradient-to-r from-muted/80 to-muted/70 border-r border-border/60 sticky left-0 z-10 transition-all duration-200 shadow-[2px_0_4px_rgba(0,0,0,0.05)]",
                isTotalRowHighlighted() && "bg-primary/20 text-primary"
              )}>
                Total
              </TableCell>
              {suppliers.map(supplier => {
                const supplierTotal = packs.reduce(
                  (sum, pack) => sum + (pack.suppliers[supplier]?.[type] || 0),
                  0
                );
                const isSelected = isCellSelected('TOTAL', supplier);
                return (
                  <TableCell
                    key={supplier}
                    onClick={() => handleCellClick('TOTAL', supplier)}
                    className={cn(
                      'text-right text-xs py-3.5 px-3 whitespace-nowrap font-bold cursor-pointer transition-all duration-200 hover:bg-primary/15',
                      isSelected && 'bg-primary/30 ring-2 ring-primary/40 shadow-sm',
                      isProfit && supplierTotal !== 0 && (
                        supplierTotal >= 0 
                          ? 'text-emerald-700 dark:text-emerald-400' 
                          : 'text-red-700 dark:text-red-400'
                      )
                    )}
                    title={`Total - ${supplier}: ${formatDisplayValue(supplierTotal)}`}
                  >
                    {isProfit && supplierTotal !== 0 && (
                      <span className="mr-1.5 font-bold">{supplierTotal >= 0 ? '↑' : '↓'}</span>
                    )}
                    {formatDisplayValue(supplierTotal)}
                  </TableCell>
                );
              })}
              <TableCell className={cn(
                'text-right text-xs py-3.5 px-3 whitespace-nowrap font-bold bg-gradient-to-r from-muted/80 to-muted/70 border-l-2 border-border/60',
                isProfit && grandTotals[type] !== 0 && (
                  grandTotals[type] >= 0 
                    ? 'text-emerald-700 dark:text-emerald-400' 
                    : 'text-red-700 dark:text-red-400'
                )
              )}>
                {isProfit && grandTotals[type] !== 0 && (
                  <span className="mr-1.5 font-bold">{grandTotals[type] >= 0 ? '↑' : '↓'}</span>
                )}
                {formatDisplayValue(grandTotals[type])}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

