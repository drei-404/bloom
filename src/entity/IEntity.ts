/**
 * Common contract for every ecosystem entity (flowers now; trees, rocks,
 * animals, rare creatures, biome objects later). Type-specific fields are
 * added by each entity's own interface that extends this.
 */
export interface IEntity {
  id: string;
  entityType: string;
  tileX: number;
  tileY: number;
  createdAtBloomDay: number;
}
