import type { RockType } from '../types/rock';
import type { TerrainType } from '../types/tile';

export const ROCK_ALLOWED_TERRAIN: TerrainType[] = ['grass'];

export const rockConfig = {
  /** Grass level a tile must reach before a rock may spawn (mature/lush). */
  matureThreshold: 0.8,
  /** Target rock count range (deterministic pick per world). */
  targetMin: 2,
  targetMax: 5,
  /** Bloom Day rocks unlock at. */
  unlockBloomDay: 9,
  /** Max sub-tile offset from tile center, in screen pixels. */
  offsetRange: 5,
} as const;

/** Deterministic type table — index chosen by seeded RNG per rock. */
export const ROCK_TYPES: readonly RockType[] = ['small', 'medium', 'large'];

export const MILESTONE_ROCKS = 'DAY_9_ROCKS_UNLOCKED';
