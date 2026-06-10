import type { TileGrid } from './tile';
import type { Flower } from './flower';
import type { Tree } from './tree';
import type { Rock } from './rock';
import type { IDecoration } from '../decoration/IDecoration';

export interface RenderState {
  timeOfDay: number;
  tileGrid: TileGrid;
  decorations: IDecoration[];
  rocks: Rock[];
  flowers: Flower[];
  trees: Tree[];
  width: number;
  height: number;
}
