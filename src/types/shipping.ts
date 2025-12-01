export type FruitType = 'BANANAS' | 'PINEAPPLES';

export interface ShippingRecord {
  id: string;
  year: number;
  week: number;
  etd: string;
  pol: string;
  item: FruitType;
  destination: string;
  supplier: string;
  sLine: string;
  container: string;
  pack: string;
  lCont: number;
  cartons: number;
  price: number;
}

export interface FilterState {
  year: number | null;
  weeks: number[];
  suppliers: string[];
  sLines: string[];
  pols: string[];
}

export interface PackStats {
  pack: string;
  containers: number;
  cartons: number;
}

export interface SupplierStats {
  supplier: string;
  containers: number;
  cartons: number;
}
