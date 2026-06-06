export const worldClockConfig = {
  // One simulation tick equals this many real seconds of runtime.
  tickSeconds: 1,
  // 1 Bloom Day = 24 runtime hours.
  runtimeHoursPerBloomDay: 24,
} as const;

export const TICKS_PER_RUNTIME_MINUTE = 60 / worldClockConfig.tickSeconds;
export const TICKS_PER_RUNTIME_HOUR = 3600 / worldClockConfig.tickSeconds;
export const TICKS_PER_BLOOM_DAY =
  TICKS_PER_RUNTIME_HOUR * worldClockConfig.runtimeHoursPerBloomDay;
