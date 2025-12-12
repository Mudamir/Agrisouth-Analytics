/**
 * Hook to fetch configuration values from Supabase
 */

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
        .select('*')
        .order('value');

      if (fetchError) {
        // If table doesn't exist, return empty array
        if (fetchError.code === '42P01') {
          return [];
        }
        throw fetchError;
      }

      return (data || []) as ConfigValue[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Helper functions to get values by type
  const getPols = () => configs.filter(c => c.type === 'pol').map(c => c.value).sort();
  const getDestinations = () => configs.filter(c => c.type === 'destination').map(c => c.value).sort();
  const getBananaSuppliers = () => configs.filter(c => c.type === 'supplier_bananas').map(c => c.value).sort();
  const getPineappleSuppliers = () => configs.filter(c => c.type === 'supplier_pineapples').map(c => c.value).sort();
  const getSLines = () => configs.filter(c => c.type === 's_line').map(c => c.value).sort();

  return {
    configs,
    isLoading,
    error,
    getPols,
    getDestinations,
    getBananaSuppliers,
    getPineappleSuppliers,
    getSLines,
  };
}










