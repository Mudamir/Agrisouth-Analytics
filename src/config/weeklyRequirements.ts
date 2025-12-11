/**
 * Weekly Container Requirements Configuration
 * 
 * Update these values based on your actual weekly requirements
 * You can set different requirements per fruit type or per week
 */

import { FruitType } from '@/types/shipping';

// Default weekly container requirements
export const DEFAULT_WEEKLY_REQUIREMENTS: Record<FruitType, number> = {
  BANANAS: 50,      // Default: 50 containers per week for bananas
  PINEAPPLES: 20,   // Default: 20 containers per week for pineapples
};

// Custom weekly requirements (optional)
// If you need different requirements per week, use this structure:
export const CUSTOM_WEEKLY_REQUIREMENTS: Record<FruitType, Record<number, number>> = {
  BANANAS: {
    // Example: Week 1: 60 containers, Week 2: 55 containers, etc.
    // 1: 60,
    // 2: 55,
    // Add specific week requirements here
  },
  PINEAPPLES: {
    // Example: Week 1: 25 containers, Week 2: 22 containers, etc.
    // 1: 25,
    // 2: 22,
    // Add specific week requirements here
  },
};

/**
 * Get weekly requirement for a specific fruit and week
 * Falls back to default if no custom requirement is set
 */
export function getWeeklyRequirement(fruit: FruitType, week: number): number {
  const customReq = CUSTOM_WEEKLY_REQUIREMENTS[fruit]?.[week];
  return customReq ?? DEFAULT_WEEKLY_REQUIREMENTS[fruit];
}

/**
 * Get all weekly requirements for a fruit type
 * Returns a map of week -> requirement
 */
export function getAllWeeklyRequirements(fruit: FruitType, weeks: number[]): Map<number, number> {
  const requirements = new Map<number, number>();
  const defaultReq = DEFAULT_WEEKLY_REQUIREMENTS[fruit];
  
  weeks.forEach(week => {
    const customReq = CUSTOM_WEEKLY_REQUIREMENTS[fruit]?.[week];
    requirements.set(week, customReq ?? defaultReq);
  });
  
  return requirements;
}

