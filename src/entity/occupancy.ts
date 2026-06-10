/** Anything that occupies a tile (entities and decorations alike). */
export interface TileOccupant {
  tileX: number;
  tileY: number;
}

/** Canonical tile-occupancy key. */
export function tileKey(tileX: number, tileY: number): string {
  return `${tileX},${tileY}`;
}

/** Build a set of tiles occupied by the given tile occupants. */
export function buildOccupancy(occupants: TileOccupant[]): Set<string> {
  return new Set(occupants.map(o => tileKey(o.tileX, o.tileY)));
}
