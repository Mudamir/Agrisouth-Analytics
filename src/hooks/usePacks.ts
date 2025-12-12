/**
 * Hook to fetch packs from Supabase database
 * Packs are organized by fruit type
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { FruitType } from '@/types/shipping';

export interface Pack {
  id: string;
  fruit_type: FruitType;
  pack_name: string;
  created_at: string;
  updated_at: string;
}

export function usePacks(fruitType: FruitType) {
  const { data: packs = [], isLoading, error } = useQuery({
    queryKey: ['packs', fruitType],
    queryFn: async () => {
      if (!supabase) {
        return [];
      }

      const { data, error: fetchError } = await supabase
        .from('packs')
        .select('*')
        .eq('fruit_type', fruitType)
        .order('pack_name');

      if (fetchError) {
        // If table doesn't exist, return empty array
        if (fetchError.code === '42P01') {
          console.warn('Packs table does not exist. Please run the SQL migration script.');
          return [];
        }
        throw fetchError;
      }

      return (data || []) as Pack[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Get pack names as array
  const packNames = packs.map(p => p.pack_name).sort();

  return {
    packs,
    packNames,
    isLoading,
    error,
  };
}


