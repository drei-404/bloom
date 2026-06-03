export type EntityType = 'grass' | 'flower' | 'tree';
export type EntityState = 'seedling' | 'growing' | 'mature';

export interface EntityInstance {
  id: string;
  type: EntityType;
  x: number;
  y: number;
  age: number;
  state: EntityState;
  metadata: Record<string, string | number | boolean>;
}

export interface EntityDefinition {
  type: EntityType;
  spawnThreshold: number;
  spawnProbability: number;
  maxCount: number;
  matureAge: number;
  requiresAdjacent?: EntityType;
  adjacentRadius?: number;
}
