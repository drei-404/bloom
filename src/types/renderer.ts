import type { TileGrid } from './tile';
import type { Flower } from './flower';

export interface RenderState {
  timeOfDay: number;
  tileGrid: TileGrid;
  flowers: Flower[];
  width: number;
  height: number;
}
