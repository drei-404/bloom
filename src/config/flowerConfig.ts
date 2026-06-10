import type { FlowerType } from '../types/flower';
import type { TerrainType } from '../types/tile';

export const FLOWER_ALLOWED_TERRAIN: TerrainType[] = ['grass'];

export const flowerConfig = {
  /** Grass level a tile must reach before a flower may spawn (mature/lush). */
  matureThreshold: 0.8,
  /** Target flower count range (deterministic pick per world). */
  targetMin: 4,
  targetMax: 8,
  /** Bloom Day the flowers milestone unlocks at. */
  unlockBloomDay: 4,
  /** Max sub-tile offset from tile center, in screen pixels. */
  offsetRange: 6,
} as const;

/** Deterministic type table — index chosen by seeded RNG per flower. */
export const FLOWER_TYPES: readonly FlowerType[] = ['white', 'pink', 'yellow', 'blue'];

export const MILESTONE_FLOWERS = 'DAY_4_FLOWERS_UNLOCKED';
