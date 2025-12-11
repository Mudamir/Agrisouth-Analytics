/**
 * Hook for managing pack requirements per year
 * Stores requirements in Supabase database
 * Requirements are weekly values (constant for the whole year)
 */

import { useState, useEffect, useCallback } from 'react';
import { FruitType } from '@/types/shipping';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface PackRequirement {
  pack: string;
  requirement: number;
}

export function usePackRequirements(fruit: FruitType, year: number) {
  const { isAdmin } = useAuth();
  const [requirements, setRequirements] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load requirements from database
  useEffect(() => {
    loadRequirements();
  }, [fruit, year]);

  const loadRequirements = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('container_requirements')
        .select('pack, containers')
        .eq('item', fruit)
        .eq('year', year);

      if (error) {
        console.error('Error loading requirements:', error);
        setRequirements({});
      } else if (data) {
        const reqs: Record<string, number> = {};
        data.forEach(row => {
          reqs[row.pack] = parseFloat(row.containers.toString());
        });
        setRequirements(reqs);
      }
    } catch (error) {
      console.error('Error loading requirements:', error);
      setRequirements({});
    } finally {
      setIsLoading(false);
    }
  }, [fruit, year]);

  // Save requirements to database
  const saveRequirements = useCallback(async (
    newRequirements: Record<string, number>
  ) => {
    if (!isAdmin) {
      throw new Error('Only administrators can edit container requirements');
    }

    if (!supabase) {
      console.error('Supabase not configured');
      return;
    }

    try {
      // Prepare upsert data
      const upsertData = Object.entries(newRequirements)
        .filter(([_, value]) => value > 0) // Only save non-zero requirements
        .map(([pack, containers]) => ({
          item: fruit,
          year: year,
          pack: pack,
          containers: containers,
        }));

      if (upsertData.length === 0) {
        // If no requirements, clear existing ones for this year
        const { error: deleteError } = await supabase
          .from('container_requirements')
          .delete()
          .eq('item', fruit)
          .eq('year', year);

        if (deleteError) throw deleteError;
        setRequirements({});
        return;
      }

      // Upsert requirements
      const { error } = await supabase
        .from('container_requirements')
        .upsert(upsertData, {
          onConflict: 'item,year,pack',
        });

      if (error) throw error;

      setRequirements(newRequirements);
    } catch (error) {
      console.error('Error saving requirements:', error);
      throw error;
    }
  }, [fruit, year, isAdmin]);


  // Get requirement for a specific pack
  const getRequirement = useCallback((pack: string): number | null => {
    return requirements[pack] ?? null;
  }, [requirements]);

  // Update requirement for a pack
  const updateRequirement = useCallback(async (pack: string, requirement: number) => {
    const updated = { ...requirements, [pack]: requirement };
    await saveRequirements(updated);
  }, [requirements, saveRequirements]);

  // Update multiple requirements at once
  const updateRequirements = useCallback(async (
    newRequirements: Record<string, number>
  ) => {
    await saveRequirements(newRequirements);
  }, [saveRequirements]);

  return {
    requirements,
    isLoading,
    getRequirement,
    updateRequirement,
    updateRequirements,
    reload: loadRequirements,
  };
}

