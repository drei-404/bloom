import type { TileGrid } from './tile';
import type { Flower } from './flower';
import type { Tree } from './tree';

export interface RenderState {
  timeOfDay: number;
  tileGrid: TileGrid;
  flowers: Flower[];
  trees: Tree[];
  width: number;
  height: number;
}
