/**
 * Pack Container Requirements Configuration
 * 
 * Set specific container requirements for each pack size
 * If a pack is not listed, requirements will be calculated proportionally
 */

import { FruitType } from '@/types/shipping';

// Pack-specific container requirements
export const PACK_REQUIREMENTS: Record<FruitType, Record<string, number>> = {
  BANANAS: {
    // Example requirements per pack (adjust as needed)
    // '13.5 KG A': 1000,
    // '13.5 KG B': 50,
    // '13.5 KG SH': 40,
    // '7KG': 200,
    // '3KG': 300,
    // '18KG': 30,
  },
  PINEAPPLES: {
    // Example requirements per pack (adjust as needed)
    // '7C': 50,
    // '8C': 30,
    // '9C': 20,
    // '10C': 15,
    // '12C': 10,
  },
};

/**
 * Get requirement for a specific pack
 * Returns null if no specific requirement is set (will use proportional calculation)
 */
export function getPackRequirement(fruit: FruitType, pack: string): number | null {
  return PACK_REQUIREMENTS[fruit]?.[pack] ?? null;
}

/**
 * Check if pack has a specific requirement set
 */
export function hasPackRequirement(fruit: FruitType, pack: string): boolean {
  return getPackRequirement(fruit, pack) !== null;
}

