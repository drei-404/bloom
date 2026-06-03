export const islandConfig = {
  canvas: { width: 400, height: 350 },
  grid: {
    size: 10,
    tileW: 40,
    tileH: 20,
    sideH: 10,
  },
  // Isometric grid origin in canvas space.
  // Tile (0,0) top vertex sits at (centerX, centerY - tileH/2).
  // Tile (9,9) bottom sits at (centerX, centerY + 9*tileH + tileH/2 + sideH).
  center: { x: 200, y: 80 },
} as const;

export type IslandConfig = typeof islandConfig;
