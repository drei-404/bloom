import type { MovementStrategy } from './MovementStrategy';
import type { TileGrid } from '../../types/tile';
import { getTile } from '../../types/tile';

/**
 * Flying movement — animals travel over everything: ground obstacles, flowers,
 * bushes, rocks and pond water are all ignored; the only constraint is staying
 * inside the island bounds. Movement is still tile-based and one step at a time
 * (the Brain proposes adjacent tiles; MovementSystem forbids teleports), and
 * flyers still own a home tile and respect home radius via the shared homeward
 * bias. No altitude, no interpolation, no free flight.
 */
const inBounds = (grid: TileGrid, x: number, y: number): boolean => getTile(grid, x, y) !== undefined;

export const flyingMovement: MovementStrategy = {
  canTraverse: (grid, x, y) => inBounds(grid, x, y),
  canOccupy: (grid, x, y) => inBounds(grid, x, y),
  // Flyers may spawn anywhere in bounds (including over water); ground occupants
  // are irrelevant to them.
  spawnTiles: grid => grid.tiles.map(t => ({ x: t.col, y: t.row })),
};
