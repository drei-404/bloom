import type { TileGrid } from './tile';
import type { Flower } from './flower';
import type { Tree } from './tree';
import type { Rock } from './rock';
import type { IDecoration } from '../decoration/IDecoration';
import type { IAnimal } from '../animal/IAnimal';

export interface RenderState {
  timeOfDay: number;
  tileGrid: TileGrid;
  decorations: IDecoration[];
  rocks: Rock[];
  flowers: Flower[];
  trees: Tree[];
  animals: IAnimal[];
  width: number;
  height: number;
}
