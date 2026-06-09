import type { IEntity } from './IEntity';

/** Canonical tile-occupancy key. */
export function tileKey(tileX: number, tileY: number): string {
  return `${tileX},${tileY}`;
}

/** Build a set of tiles occupied by the given entities. */
export function buildOccupancy(entities: IEntity[]): Set<string> {
  return new Set(entities.map(e => tileKey(e.tileX, e.tileY)));
}
