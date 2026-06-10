import type { TileGrid } from './tile';

export interface WorldState {
  version: number;
  dayCount: number;
  timeOfDay: number;
  totalTicks: number;
  tileGrid: TileGrid;
  totalActivityScore: number;
  lastSavedAt: number;
  createdAt: number;
}
