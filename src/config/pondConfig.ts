export const pondConfig = {
  /** Bloom Day the pond unlocks at. */
  unlockBloomDay: 13,
  /** Final connected-water-tile count range (deterministic per world). */
  sizeMin: 3,
  sizeMax: 6,
  /** Tiles revealed per Bloom Day after unlock. */
  expandPerBloomDay: 1,
} as const;

export const MILESTONE_POND = 'DAY_13_POND_UNLOCKED';
