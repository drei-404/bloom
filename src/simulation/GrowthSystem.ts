import type { EntityInstance, EntityType, EntityState } from '../types/entity';
import { entityDefinitions } from '../config/entityConfig';
import { worldConfig } from '../config/worldConfig';

function hasAdjacent(
  x: number,
  y: number,
  radius: number,
  entities: EntityInstance[],
  type: EntityType,
): boolean {
  return entities.some(e => e.type === type && Math.hypot(e.x - x, e.y - y) <= radius);
}

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function makeEntity(type: EntityType, x: number, y: number): EntityInstance {
  return {
    id: crypto.randomUUID(),
    type,
    x,
    y,
    age: 0,
    state: 'seedling',
    metadata: {},
  };
}

export function tickGrowth(entities: EntityInstance[], activityScore: number): EntityInstance[] {
  const spawned: EntityInstance[] = [];
  const working = [...entities];

  for (const def of entityDefinitions) {
    const count = working.filter(e => e.type === def.type).length;
    if (count >= def.maxCount) continue;
    if (activityScore < def.spawnThreshold) continue;
    if (Math.random() > def.spawnProbability) continue;

    const { spawnZone } = worldConfig;
    const x = randomInRange(spawnZone.xMin, spawnZone.xMax);
    const y = randomInRange(spawnZone.yMin, spawnZone.yMax);

    if (def.requiresAdjacent !== undefined && def.adjacentRadius !== undefined) {
      if (!hasAdjacent(x, y, def.adjacentRadius, working, def.requiresAdjacent)) continue;
    }

    const entity = makeEntity(def.type, x, y);
    spawned.push(entity);
    working.push(entity);
  }

  return spawned;
}

function resolveState(age: number, matureAge: number): EntityState {
  if (age < matureAge * 0.3) return 'seedling';
  if (age < matureAge) return 'growing';
  return 'mature';
}

export function tickEntityAging(entities: EntityInstance[]): EntityInstance[] {
  return entities.map(entity => {
    const def = entityDefinitions.find(d => d.type === entity.type);
    if (!def) return entity;
    const age = entity.age + 1;
    return { ...entity, age, state: resolveState(age, def.matureAge) };
  });
}
