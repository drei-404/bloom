export const rabbitConfig = {
  /** Bloom Day rabbits unlock at. */
  unlockBloomDay: 15,
  /** Maximum rabbit population. */
  maxPopulation: 3,
  /** Spawn preference radius around trees / vegetation (tiles). */
  preferRadius: 2,
  /** Chance an idle rabbit goes to sleep instead of walking (0..1). */
  sleepChance: 0.3,
  /** State durations in seconds (deterministic pick within range, seeded). */
  timers: {
    idleMin: 120,
    idleMax: 300,
    walkMin: 5,
    walkMax: 15,
    sleepMin: 60,
    sleepMax: 180,
  },
} as const;

export const SPECIES_RABBIT = 'rabbit';
