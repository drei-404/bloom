import type { WorldClock } from './clock';

export interface SimulationConfig {
  tickIntervalMs: number;
  dayLengthTicks: number;
  autoSaveIntervalTicks: number;
  idleThresholdMs: number;
}

/**
 * Per-tick context handed to simulation systems. Carries the runtime World Clock
 * so progression systems (future flowers, trees, pond, animals) can gate on
 * `clock.bloomDays` without changing their call signatures.
 */
export interface SimulationContext {
  activityScore: number;
  timeOfDay: number;
  clock: WorldClock;
}
