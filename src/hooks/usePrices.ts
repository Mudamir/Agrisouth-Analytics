import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { FruitType } from '@/types/shipping';

export const PRICES_QUERY_KEY = ['prices'] as const;

const PRICE_COLUMNS = 'id,item,pack,supplier,price,price_type,year,updated_at';

export interface PriceRow {
  id: string;
  item: FruitType;
  pack: string;
  supplier: string | null;
  price: number;
  price_type: 'sales' | 'purchase';
  year: number;
  updated_at: string;
}

async function fetchAllPrices(): Promise<PriceRow[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('prices')
    .select(PRICE_COLUMNS)
    .order('item')
    .order('year', { ascending: false })
    .order('pack');

  if (error) {
    throw error;
  }

  return (data || []) as PriceRow[];
}

export function usePrices() {
  return useQuery({
    queryKey: PRICES_QUERY_KEY,
    queryFn: fetchAllPrices,
    enabled: !!supabase,
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
