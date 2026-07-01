import type { MovementStrategy } from './MovementStrategy';
import type { TileGrid } from '../../types/tile';
import type { TileCoord } from '../../animal/AnimalRegionService';
import { buildOccupancy, tileKey } from '../../entity/occupancy';
import { terrainService } from '../../terrain/TerrainService';

/**
 * Water movement — the amphibious rule set shared by every future water animal
 * (duck, goose, frog, turtle, otter). Water animals are the only movers that may
 * occupy BOTH grass and water, so they cross the shoreline naturally. Everything
 * else is the same one-tile-at-a-time, deterministic, no-teleport contract the
 * other strategies obey; only movement legality differs.
 *
 * Legality (via TerrainService.canPlace):
 *   - terrain must be grass OR water (amphibious)
 *   - never a reserved tile (a pending pond-footprint reservation is invalid)
 *   - never out of bounds (canPlace treats an undefined tile as illegal)
 *   - never onto a tile already occupied by an entity/decoration (traverse only)
 *
 * Spawn (see spawnTiles): water species prefer the pond edge. When any water
 * exists the candidate set is RESTRICTED to water-and-adjacent tiles — a hard
 * restriction, not a soft ordering, because PopulationManager seed-shuffles the
 * returned tiles (so a mere ordering would be lost). Before a pond exists the
 * strategy falls back to ordinary grass spawning.
 */

const AMPHIBIOUS: ('grass' | 'water')[] = ['grass', 'water'];

/** Legal terrain/bounds/reservation for a water animal (no occupancy). */
const canPlace = (grid: TileGrid, x: number, y: number): boolean =>
  terrainService.canPlace(grid, x, y, AMPHIBIOUS);

/** Whether (x, y) is water or touches water in its 8-neighbourhood. */
const nearWater = (grid: TileGrid, x: number, y: number): boolean => {
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (terrainService.terrainAt(grid, x + dx, y + dy) === 'water') return true;
    }
  }
  return false;
};

export const waterMovement: MovementStrategy = {
  canTraverse: (grid, x, y, occupied) => {
    if (!canPlace(grid, x, y)) return false;
    return !buildOccupancy(occupied).has(tileKey(x, y));
  },
  canOccupy: (grid, x, y) => canPlace(grid, x, y),
  spawnTiles: (grid, occupied) => {
    const occupancy = buildOccupancy(occupied);
    const valid: TileCoord[] = grid.tiles
      .filter(
        t => canPlace(grid, t.col, t.row) && !occupancy.has(tileKey(t.col, t.row)),
      )
      .map(t => ({ x: t.col, y: t.row }));

    // Pond exists → restrict to the shoreline (water + adjacent). Otherwise the
    // world has no pond yet: spawn normally on grass.
    const hasWater = grid.tiles.some(t => t.terrainType === 'water');
    if (!hasWater) return valid;
    return valid.filter(c => nearWater(grid, c.x, c.y));
  },
};
