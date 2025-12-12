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

  // Format value helper - shows 0 instead of blank
  const formatDisplayValue = (value: number) => {
    if (value === 0) {
      return type === 'cartons' ? '0' : (type === 'profit' ? '$0.00' : '$0.00');
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
    <div className="bg-card rounded-lg border border-border shadow-sm">
      {/* Compact Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">{title}</h3>
        {type === 'profit' && grandTotals.profit !== 0 && (
          <span className={cn(
            "text-xs font-semibold px-2 py-0.5 rounded",
            grandTotals.profit >= 0 
              ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
              : "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400"
          )}>
            {grandTotals.profit >= 0 ? '↑' : '↓'} {formatDisplayValue(grandTotals.profit)}
          </span>
        )}
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 border-b border-border h-8">
              <TableHead className="w-24 font-semibold text-[10px] py-1.5 px-2 bg-muted/60 sticky left-0 z-20 border-r border-border">
                Pack
              </TableHead>
              {suppliers.map(supplier => {
                const isHighlighted = isSupplierHighlighted(supplier);
                return (
                  <TableHead 
                    key={supplier} 
                    className={cn(
                      "text-right font-semibold min-w-[90px] text-[10px] py-1.5 px-2 whitespace-nowrap transition-all duration-150",
                      isHighlighted && "bg-primary/20 ring-1 ring-primary/40"
                    )}
                  >
                    <span className="text-[10px]">{supplier}</span>
                  </TableHead>
                );
              })}
              <TableHead className="text-right font-semibold min-w-[90px] text-[10px] py-1.5 px-2 whitespace-nowrap bg-muted/80 border-l-2 border-border">
                <span className="text-[10px]">Total</span>
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
                    "hover:bg-muted/5 border-b border-border/50 transition-colors duration-100",
                    packIsHighlighted && "bg-primary/5"
                  )}
                >
                  <TableCell className={cn(
                    "font-semibold text-[11px] py-1.5 px-2 bg-muted/30 border-r border-border sticky left-0 z-10 transition-colors duration-100",
                    packIsHighlighted && "bg-primary/15"
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
                        'text-right text-[11px] py-1.5 px-2 font-medium cursor-pointer transition-all duration-100 whitespace-nowrap',
                        'hover:bg-primary/8',
                        isSelected && 'bg-primary/20 ring-1 ring-primary/50 font-semibold',
                        isProfit && value !== 0 && (
                          value >= 0 
                            ? 'text-emerald-600 dark:text-emerald-500' 
                            : 'text-red-600 dark:text-red-500'
                        ),
                        !isProfit && isSelected && 'text-primary'
                      )}
                      title={`${pack.pack} - ${supplier}: ${formatDisplayValue(value)}`}
                    >
                      {isProfit && value !== 0 && (
                        <span className="mr-1">{value >= 0 ? '↑' : '↓'}</span>
                      )}
                      {formatDisplayValue(value)}
                    </TableCell>
                  );
                })}
                <TableCell className={cn(
                  'text-right text-[11px] py-1.5 px-2 font-semibold whitespace-nowrap bg-muted/40 border-l-2 border-border',
                  isProfit && pack.totals[type] !== 0 && (
                    pack.totals[type] >= 0 
                      ? 'text-emerald-600 dark:text-emerald-500' 
                      : 'text-red-600 dark:text-red-500'
                  )
                )}>
                  {isProfit && pack.totals[type] !== 0 && (
                    <span className="mr-1">{pack.totals[type] >= 0 ? '↑' : '↓'}</span>
                  )}
                  {formatDisplayValue(pack.totals[type])}
                </TableCell>
              </TableRow>
              );
            })}
            <TableRow className={cn(
              "bg-muted/60 font-semibold border-t-2 border-border transition-colors duration-100",
              isTotalRowHighlighted() && "bg-primary/5"
            )}>
              <TableCell className={cn(
                "font-bold text-[11px] py-2 px-2 bg-muted/70 border-r border-border sticky left-0 z-10 transition-colors duration-100",
                isTotalRowHighlighted() && "bg-primary/15"
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
                      'text-right text-[11px] py-2 px-2 whitespace-nowrap font-semibold cursor-pointer transition-all duration-100 hover:bg-primary/8',
                      isSelected && 'bg-primary/20 ring-1 ring-primary/50',
                      isProfit && supplierTotal !== 0 && (
                        supplierTotal >= 0 
                          ? 'text-emerald-600 dark:text-emerald-500' 
                          : 'text-red-600 dark:text-red-500'
                      )
                    )}
                    title={`Total - ${supplier}: ${formatDisplayValue(supplierTotal)}`}
                  >
                    {isProfit && supplierTotal !== 0 && (
                      <span className="mr-1">{supplierTotal >= 0 ? '↑' : '↓'}</span>
                    )}
                    {formatDisplayValue(supplierTotal)}
                  </TableCell>
                );
              })}
              <TableCell className={cn(
                'text-right text-[11px] py-2 px-2 whitespace-nowrap font-bold bg-muted/70 border-l-2 border-border',
                isProfit && grandTotals[type] !== 0 && (
                  grandTotals[type] >= 0 
                    ? 'text-emerald-600 dark:text-emerald-500' 
                    : 'text-red-600 dark:text-red-500'
                )
              )}>
                {isProfit && grandTotals[type] !== 0 && (
                  <span className="mr-1">{grandTotals[type] >= 0 ? '↑' : '↓'}</span>
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

