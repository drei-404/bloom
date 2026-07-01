import type { MovementStrategy } from './MovementStrategy';
import { animalRegionService } from '../../animal/AnimalRegionService';

/**
 * Ground movement — the pre-existing rules, unchanged: grass only, never water,
 * never reserved (pond) terrain, never onto an occupied tile. Delegates to
 * AnimalRegionService so walkers (rabbit, deer) behave exactly as before.
 */
export const groundMovement: MovementStrategy = {
  canTraverse: (grid, x, y, occupied) => animalRegionService.isWalkable(grid, x, y, occupied),
  canOccupy: (grid, x, y) => animalRegionService.isWalkable(grid, x, y, []),
  spawnTiles: (grid, occupied) => animalRegionService.spawnTiles(grid, occupied),
};
