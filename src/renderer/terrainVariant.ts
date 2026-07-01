import { ASSET_IDS } from '../assets/placeholderPack';
import { getTile, type TileData, type TileGrid } from '../types/tile';

/**
 * Pure, Pixi-free terrain variant selection for the renderer's sprite hooks.
 *
 * The simulation is frozen and `TileData` carries no variant field, so every
 * choice is a deterministic pure function of tile position (a `(col,row)` hash,
 * matching the tuft idiom in PixiRenderer) or of grid adjacency. Same grid →
 * same art every render, no RNG, no new sim state. Kept free of Pixi so it can
 * be unit-tested without a WebGL context.
 */

const GRASS_VARIANTS = 6;
const DIRT_VARIANTS = 4;

export interface TileTop {
  assetId: string;
  frame: string;
}

/**
 * Grass-vs-dirt (continuous with the primitive `lerpColor(dirt,grass,grassLevel)`
 * at the same 0.5 threshold) plus a per-tile variant frame. Frame ids match the
 * `terrain_grass.png` / `terrain_dirt.png` strips.
 */
export function tileTopVariant(tile: TileData): TileTop {
  const { col, row } = tile;
  if (tile.grassLevel >= 0.5) {
    return { assetId: ASSET_IDS.tileGrass, frame: `g${(col * 31 + row * 17) % GRASS_VARIANTS}` };
  }
  return { assetId: ASSET_IDS.tileDirt, frame: `d${(col * 29 + row * 23) % DIRT_VARIANTS}` };
}

/** Deterministic per-tile ripple phase so ponds don't animate in lockstep. */
export function waterPhase(col: number, row: number, frameCount: number): number {
  if (frameCount <= 0) return 0;
  return (((col * 31 + row * 17) % frameCount) + frameCount) % frameCount;
}

/**
 * The foam-edge variant for a water tile, chosen from which 4-neighbours are
 * land (in-grid, non-water). Screen-space edge mapping (iso): N-1→NE, +1col→SE,
 * +1row→SW, -1col→NW. Returns one of 8 frame ids, or null when there's no single
 * clean land-facing edge (interior water, or 3+ sides) — caller draws no overlay.
 */
export function shorelineVariant(grid: TileGrid, tile: TileData): string | null {
  if (tile.terrainType !== 'water') return null;
  const { col, row } = tile;
  const isLand = (c: number, r: number): boolean => {
    const t = getTile(grid, c, r);
    return !!t && t.terrainType !== 'water';
  };
  const ne = isLand(col, row - 1);
  const se = isLand(col + 1, row);
  const sw = isLand(col, row + 1);
  const nw = isLand(col - 1, row);

  // Adjacent pairs (outer corners of the pond) first.
  if (ne && nw && !se && !sw) return 'e_n';
  if (ne && se && !sw && !nw) return 'e_e';
  if (se && sw && !ne && !nw) return 'e_s';
  if (sw && nw && !ne && !se) return 'e_w';
  // Single land-facing edge.
  if (ne && !se && !sw && !nw) return 'e_ne';
  if (se && !ne && !sw && !nw) return 'e_se';
  if (sw && !ne && !se && !nw) return 'e_sw';
  if (nw && !ne && !se && !sw) return 'e_nw';
  return null;
}

/**
 * The rounded-corner overlay for the 4 silhouette vertices of the square island,
 * or null for every other tile. Pure function of grid position.
 *   (0,0)→north tip, (size-1,0)→east, (0,size-1)→west, (size-1,size-1)→south.
 */
export function cornerVariant(col: number, row: number, size: number): string | null {
  const last = size - 1;
  if (col === 0 && row === 0) return 'n';
  if (col === last && row === 0) return 'e';
  if (col === 0 && row === last) return 'w';
  if (col === last && row === last) return 's';
  return null;
}
