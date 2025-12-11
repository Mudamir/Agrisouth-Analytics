import { PNLTable } from './PNLTable';
import { SupplierData, PackData } from '../PNLView';

interface CartonsSectionProps {
  packs: PackData[];
  suppliers: string[];
  grandTotals: SupplierData;
  selectedCell?: { pack: string; supplier: string } | null;
  onCellClick?: (cell: { pack: string; supplier: string } | null) => void;
}

export function CartonsSection({ packs, suppliers, grandTotals, selectedCell, onCellClick }: CartonsSectionProps) {
  const formatCartons = (value: number) => {
    return value.toLocaleString('en-US');
  };

  return (
    <PNLTable
      title="Sum of CARTONS"
      packs={packs}
      suppliers={suppliers}
      grandTotals={grandTotals}
      type="cartons"
      formatValue={formatCartons}
      selectedCell={selectedCell}
      onCellClick={onCellClick}
    />
  );
}

