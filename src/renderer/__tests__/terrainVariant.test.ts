import { describe, it, expect } from 'vitest';
import {
  tileTopVariant,
  waterPhase,
  shorelineVariant,
  cornerVariant,
} from '../terrainVariant';
import { ASSET_IDS } from '../../assets/placeholderPack';
import type { TileData, TileGrid } from '../../types/tile';

const tile = (col: number, row: number, over: Partial<TileData> = {}): TileData => ({
  col,
  row,
  grassLevel: 1,
  terrainType: 'grass',
  ...over,
});

// Build a size×size grid indexed [col*size+row] (matches getTile in types/tile).
const grid = (size: number, water: Array<[number, number]>): TileGrid => {
  const set = new Set(water.map(([c, r]) => `${c}:${r}`));
  const tiles: TileData[] = [];
  for (let c = 0; c < size; c++) {
    for (let r = 0; r < size; r++) {
      tiles[c * size + r] = tile(c, r, {
        terrainType: set.has(`${c}:${r}`) ? 'water' : 'grass',
        grassLevel: set.has(`${c}:${r}`) ? 0 : 1,
      });
    }
  }
  return { size, tiles };
};

describe('tileTopVariant', () => {
  it('picks grass at/above the 0.5 threshold, dirt below', () => {
    expect(tileTopVariant(tile(1, 1, { grassLevel: 0.5 })).assetId).toBe(ASSET_IDS.tileGrass);
    expect(tileTopVariant(tile(1, 1, { grassLevel: 0.49 })).assetId).toBe(ASSET_IDS.tileDirt);
  });

  it('is deterministic and maps to an in-range frame', () => {
    const a = tileTopVariant(tile(3, 7));
    const b = tileTopVariant(tile(3, 7));
    expect(a).toEqual(b);
    expect(a.frame).toMatch(/^g[0-5]$/);
    expect(tileTopVariant(tile(3, 7, { grassLevel: 0 })).frame).toMatch(/^d[0-3]$/);
  });
});

describe('waterPhase', () => {
  it('is a stable in-range offset', () => {
    expect(waterPhase(4, 2, 4)).toBe(waterPhase(4, 2, 4));
    expect(waterPhase(4, 2, 4)).toBeGreaterThanOrEqual(0);
    expect(waterPhase(4, 2, 4)).toBeLessThan(4);
  });
  it('guards a zero frame count', () => {
    expect(waterPhase(4, 2, 0)).toBe(0);
  });
});

describe('shorelineVariant', () => {
  it('returns null for land tiles', () => {
    const g = grid(5, [[2, 2]]);
    expect(shorelineVariant(g, tile(0, 0))).toBeNull();
  });

  it('detects a single land-facing edge (SE = +1 col is land)', () => {
    // water at (2,2); land everywhere else. All 4 neighbours are land → not a
    // single clean edge → null. Narrow to one edge with a 2-wide pond.
    const g = grid(6, [[2, 2], [1, 2], [2, 1], [1, 1]]);
    // tile (2,2): neighbours (2,1)=water NE, (3,2)=land SE, (2,3)=land SW, (1,2)=water NW
    // → SE & SW land, NE & NW water → adjacent pair 'e_s'
    expect(shorelineVariant(g, g.tiles[2 * 6 + 2])).toBe('e_s');
  });

  it('returns null when surrounded by land on 3+ sides', () => {
    const g = grid(5, [[2, 2]]); // lone water tile, all neighbours land
    expect(shorelineVariant(g, g.tiles[2 * 5 + 2])).toBeNull();
  });
});

describe('cornerVariant', () => {
  it('tags the 4 silhouette vertices, null elsewhere', () => {
    expect(cornerVariant(0, 0, 10)).toBe('n');
    expect(cornerVariant(9, 0, 10)).toBe('e');
    expect(cornerVariant(0, 9, 10)).toBe('w');
    expect(cornerVariant(9, 9, 10)).toBe('s');
    expect(cornerVariant(5, 5, 10)).toBeNull();
    expect(cornerVariant(0, 5, 10)).toBeNull();
  });
});
