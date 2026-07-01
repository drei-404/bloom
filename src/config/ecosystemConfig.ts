/**
 * Ecosystem Identity tuning. Discovery is deliberately slow: a world reveals its
 * native wildlife one species at a time so it feels found, not scripted.
 */
export const ecosystemConfig = {
  /** How many native species each world owns for its lifetime. */
  nativeSpeciesCount: 4,
  /** First Bloom Day a native species can be discovered (animals unlock). */
  discoveryStartBloomDay: 15,
  /** Bloom Days between successive discoveries. */
  discoveryIntervalBloomDays: 2,
} as const;
