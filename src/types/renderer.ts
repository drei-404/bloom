import type { TileGrid } from './tile';

export interface RenderState {
  timeOfDay: number;
  tileGrid: TileGrid;
  width: number;
  height: number;
}
