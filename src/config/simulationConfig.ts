import type { SimulationConfig } from '../types/simulation';

export const simulationConfig: SimulationConfig = {
  tickIntervalMs: 1000,
  dayLengthTicks: 300,
  autoSaveIntervalTicks: 60,
  idleThresholdMs: 30_000,
};
