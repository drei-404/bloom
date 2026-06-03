export interface TileData {
  col: number;
  row: number;
  grassLevel: number;
}

export interface TileGrid {
  size: number;
  tiles: TileData[];
}

export function getTile(grid: TileGrid, col: number, row: number): TileData | undefined {
  if (col < 0 || col >= grid.size || row < 0 || row >= grid.size) return undefined;
  return grid.tiles[col * grid.size + row];
}
