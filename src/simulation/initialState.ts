import type { WorldState } from '../types/world';
import type { TileGrid } from '../types/tile';
import { islandConfig } from '../config/islandConfig';
import { growthConfig } from '../config/growthConfig';

function createTileGrid(): TileGrid {
  const { size } = islandConfig.grid;
  const tiles = [];

  for (let col = 0; col < size; col++) {
    for (let row = 0; row < size; row++) {
      const isSeed = (growthConfig.seedTiles as ReadonlyArray<{ col: number; row: number }>)
        .some(s => s.col === col && s.row === row);
      tiles.push({ col, row, grassLevel: isSeed ? 0.05 : 0.0, terrainType: 'grass' as const });
    }
  }

  return { size, tiles };
}

export function createInitialWorldState(): WorldState {
  return {
    version: 3,
    dayCount: 1,
    timeOfDay: 0.25,
    totalTicks: 0,
    tileGrid: createTileGrid(),
    totalActivityScore: 0,
    lastSavedAt: 0,
    createdAt: Date.now(),
  };
}
