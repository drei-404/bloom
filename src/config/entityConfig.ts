import type { EntityDefinition } from '../types/entity';

export const entityDefinitions: EntityDefinition[] = [
  {
    type: 'grass',
    spawnThreshold: 5,
    spawnProbability: 0.4,
    maxCount: 80,
    matureAge: 30,
  },
  {
    type: 'flower',
    spawnThreshold: 20,
    spawnProbability: 0.2,
    maxCount: 40,
    matureAge: 60,
    requiresAdjacent: 'grass',
    adjacentRadius: 40,
  },
  {
    type: 'tree',
    spawnThreshold: 50,
    spawnProbability: 0.08,
    maxCount: 15,
    matureAge: 120,
    requiresAdjacent: 'grass',
    adjacentRadius: 50,
  },
];
