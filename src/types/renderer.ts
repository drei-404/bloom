import type { TileGrid } from './tile';
import type { Flower } from './flower';
import type { Tree } from './tree';
import type { Rock } from './rock';

export interface RenderState {
  timeOfDay: number;
  tileGrid: TileGrid;
  rocks: Rock[];
  flowers: Flower[];
  trees: Tree[];
  width: number;
  height: number;
}
