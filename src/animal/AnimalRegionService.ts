import type { TileGrid } from '../types/tile';
import type { TileOccupant } from '../entity/occupancy';
import { buildOccupancy, tileKey } from '../entity/occupancy';
import { terrainService } from '../terrain/TerrainService';

export interface TileCoord {
  x: number;
  y: number;
}

/**
 * Determines where animals may walk and spawn. Pure: reads the grid plus the
 * list of tile occupants (entities + decorations); no store or SQL access.
 *
 * Rules (walkable == spawnable for the framework):
 *   - grass terrain only (never water)
 *   - not reserved (pond water reservations)
 *   - not occupied by entities or decorations
 */
class AnimalRegion {
  private isGrass(grid: TileGrid, x: number, y: number): boolean {
    return terrainService.terrainAt(grid, x, y) === 'grass';
  }

  isWalkable(grid: TileGrid, x: number, y: number, occupants: TileOccupant[]): boolean {
    if (!this.isGrass(grid, x, y)) return false;
    if (terrainService.isReserved(x, y)) return false;
    const occupied = buildOccupancy(occupants);
    return !occupied.has(tileKey(x, y));
  }

  isSpawnable(grid: TileGrid, x: number, y: number, occupants: TileOccupant[]): boolean {
    return this.isWalkable(grid, x, y, occupants);
  }

  private validTiles(grid: TileGrid, occupants: TileOccupant[]): TileCoord[] {
    const occupied = buildOccupancy(occupants);
    return grid.tiles
      .filter(
        t =>
          this.isGrass(grid, t.col, t.row) &&
          !terrainService.isReserved(t.col, t.row) &&
          !occupied.has(tileKey(t.col, t.row)),
      )
      .map(t => ({ x: t.col, y: t.row }));
  }

  walkableTiles(grid: TileGrid, occupants: TileOccupant[]): TileCoord[] {
    return this.validTiles(grid, occupants);
  }

  spawnTiles(grid: TileGrid, occupants: TileOccupant[]): TileCoord[] {
    return this.validTiles(grid, occupants);
  }
}

export const animalRegionService = new AnimalRegion();
