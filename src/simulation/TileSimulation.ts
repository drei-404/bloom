import type { TileGrid, TileData } from '../types/tile';
import type { SimulationContext } from '../types/simulation';
import { growthConfig } from '../config/growthConfig';

function getNeighbors(grid: TileGrid, col: number, row: number): TileData[] {
  const result: TileData[] = [];
  const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dc, dr] of dirs) {
    const nc = col + dc;
    const nr = row + dr;
    if (nc >= 0 && nc < grid.size && nr >= 0 && nr < grid.size) {
      result.push(grid.tiles[nc * grid.size + nr]);
    }
  }
  return result;
}

export function tickTileGrowth(grid: TileGrid, ctx: SimulationContext): TileGrid {
  // Visual day/night still modulates grass growth speed.
  // ctx.clock.bloomDays is available here for future progression gating.
  const isDay = ctx.timeOfDay < 0.5;
  const dayMult = isDay ? 1.0 : growthConfig.nightMultiplier;
  const actMult = growthConfig.activityScoreToMult(ctx.activityScore);

  const newTiles = grid.tiles.map(tile => {
    const neighbors = getNeighbors(grid, tile.col, tile.row);
    const avgNeighborGrass =
      neighbors.length > 0
        ? neighbors.reduce((s, n) => s + n.grassLevel, 0) / neighbors.length
        : 0;
    const spreadBonus = avgNeighborGrass * growthConfig.spreadFactor;
    const rate = growthConfig.baseRate * (1 + spreadBonus) * actMult * dayMult;
    return { ...tile, grassLevel: Math.min(1.0, tile.grassLevel + rate) };
  });

  return { ...grid, tiles: newTiles };
}
