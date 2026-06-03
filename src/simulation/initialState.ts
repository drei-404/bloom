import type { WorldState } from '../types/world';

export function createInitialWorldState(): WorldState {
  return {
    version: 1,
    dayCount: 1,
    timeOfDay: 0.5,
    totalTicks: 0,
    entities: [],
    weather: { type: 'clear', intensity: 0, cloudCoverage: 0.1 },
    totalActivityScore: 0,
    lastSavedAt: 0,
    createdAt: Date.now(),
  };
}
