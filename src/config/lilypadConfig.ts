export const lilypadConfig = {
  /** Bloom Day lily pads unlock at. */
  unlockBloomDay: 14,
  /** Target lily pad count range (deterministic per world). */
  countMin: 1,
  countMax: 3,
} as const;

export const MILESTONE_LILYPADS = 'DAY_14_LILYPADS_UNLOCKED';
export const DECORATION_LILYPAD = 'lilypad';
