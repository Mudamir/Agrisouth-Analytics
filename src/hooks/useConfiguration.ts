/**
 * Hook to fetch configuration values from Supabase
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type ConfigType = 'pol' | 'destination' | 'supplier_bananas' | 'supplier_pineapples' | 's_line';

interface ConfigValue {
  id: string;
  type: ConfigType;
  value: string;
  created_at: string;
}

export function useConfiguration() {
  const { data: configs = [], isLoading, error } = useQuery({
    queryKey: ['configuration-values'],
    queryFn: async () => {
      if (!supabase) {
        return [];
      }

      const { data, error: fetchError } = await supabase
        .from('configuration_values')
        .select('id, type, value, created_at')
        .order('value');

      if (fetchError) {
        if (fetchError.code === '42P01') {
          return [];
        }
        throw fetchError;
      }

      return (data || []) as ConfigValue[];
    },
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const pols = useMemo(
    () => configs.filter((c) => c.type === 'pol').map((c) => c.value).sort(),
    [configs]
  );
  const destinations = useMemo(
    () => configs.filter((c) => c.type === 'destination').map((c) => c.value).sort(),
    [configs]
  );
  const bananaSuppliers = useMemo(
    () => configs.filter((c) => c.type === 'supplier_bananas').map((c) => c.value).sort(),
    [configs]
  );
  const pineappleSuppliers = useMemo(
    () => configs.filter((c) => c.type === 'supplier_pineapples').map((c) => c.value).sort(),
    [configs]
  );
  const sLines = useMemo(
    () => configs.filter((c) => c.type === 's_line').map((c) => c.value).sort(),
    [configs]
  );

  return {
    configs,
    isLoading,
    error,
    getPols: () => pols,
    getDestinations: () => destinations,
    getBananaSuppliers: () => bananaSuppliers,
    getPineappleSuppliers: () => pineappleSuppliers,
    getSLines: () => sLines,
  };
}
