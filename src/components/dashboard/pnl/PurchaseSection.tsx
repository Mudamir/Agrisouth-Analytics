import { PNLTable } from './PNLTable';
import { SupplierData, PackData } from '../PNLView';

interface PurchaseSectionProps {
  packs: PackData[];
  suppliers: string[];
  grandTotals: SupplierData;
  selectedCell?: { pack: string; supplier: string } | null;
  onCellClick?: (cell: { pack: string; supplier: string } | null) => void;
}

export function PurchaseSection({ packs, suppliers, grandTotals, selectedCell, onCellClick }: PurchaseSectionProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <PNLTable
      title="PURCHASE (In USD)"
      packs={packs}
      suppliers={suppliers}
      grandTotals={grandTotals}
      type="purchase"
      formatValue={formatCurrency}
      selectedCell={selectedCell}
      onCellClick={onCellClick}
    />
  );
}

