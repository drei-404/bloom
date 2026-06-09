import type { TreeStage, TreeSpecies } from '../types/tree';

export const treeConfig = {
  /** Grass level a tile must reach before a tree may spawn (mature/lush). */
  matureThreshold: 0.8,
  /** Target tree count range (deterministic pick per world). */
  targetMin: 7,
  targetMax: 9,
  /** Bloom Day trees unlock at, and the day the target is reached. */
  unlockBloomDay: 5,
  targetReachedBloomDay: 7,
  /** Max sub-tile offset from tile center, in screen pixels. */
  offsetRange: 4,
  /** Age (in Bloom Days since creation) thresholds for lifecycle stages. */
  youngAge: 1,
  matureAge: 2,
  /** V1 species. */
  defaultSpecies: 'oak' as TreeSpecies,
} as const;

export const MILESTONE_TREES = 'DAY_5_TREES_UNLOCKED';

/** Derive lifecycle stage from age in Bloom Days. */
export function treeStageForAge(age: number): TreeStage {
  if (age >= treeConfig.matureAge) return 'mature';
  if (age >= treeConfig.youngAge) return 'young';
  return 'sapling';
}
