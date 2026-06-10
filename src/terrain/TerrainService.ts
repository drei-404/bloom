import type { TileGrid, TerrainType } from '../types/tile';
import { getTile } from '../types/tile';

/**
 * Terrain Transformation Framework.
 *
 * Terrain is a property of tiles (grass | water, extensible). Future systems
 * (ponds, rivers, beaches, snow, biome packs) mutate terrain through this
 * service without touching entity architecture. Entities validate placement
 * against terrain rules here.
 */
class Terrain {
  /** Tiles reserved for an in-progress terrain change (e.g. pond footprint). */
  private readonly reserved = new Set<string>();

  private key(x: number, y: number): string {
    return `${x},${y}`;
  }

  // ── Query ──────────────────────────────────────────────

  terrainAt(grid: TileGrid, x: number, y: number): TerrainType | undefined {
    return getTile(grid, x, y)?.terrainType;
  }

  // ── Mutate ─────────────────────────────────────────────

  /** Return a new grid with the given tile's terrain changed (immutable). */
  setTerrain(grid: TileGrid, x: number, y: number, type: TerrainType): TileGrid {
    const tiles = grid.tiles.map(t =>
      t.col === x && t.row === y ? { ...t, terrainType: type } : t,
    );
    return { ...grid, tiles };
  }

  // ── Reserve ────────────────────────────────────────────

  reserve(x: number, y: number): void {
    this.reserved.add(this.key(x, y));
  }

  isReserved(x: number, y: number): boolean {
    return this.reserved.has(this.key(x, y));
  }

  clearReservations(): void {
    this.reserved.clear();
  }

  // ── Validate ───────────────────────────────────────────

  /**
   * Whether an entity may be placed on (x, y): the tile's terrain must be in
   * `allowed` and the tile must not be reserved for a pending terrain change.
   */
  canPlace(grid: TileGrid, x: number, y: number, allowed: TerrainType[]): boolean {
    if (this.isReserved(x, y)) return false;
    const terrain = this.terrainAt(grid, x, y);
    return terrain !== undefined && allowed.includes(terrain);
  }
}

export const terrainService = new Terrain();
