import { describe, it, expect, beforeEach } from 'vitest';
import type { TileGrid, TileData } from '../../types/tile';
import type { AnimalAgent, ResolvedSpecies } from '../types';
import type { IAnimal } from '../../animal/IAnimal';
import { terrainService } from '../../terrain/TerrainService';
import { movementSystem } from '../MovementSystem';

function grid(size = 5): TileGrid {
  const tiles: TileData[] = [];
  for (let col = 0; col < size; col++) {
    for (let row = 0; row < size; row++) {
      tiles.push({ col, row, grassLevel: 1, terrainType: 'grass' });
    }
  }
  return { size, tiles };
}

const cfg: ResolvedSpecies = {
  species: 'tester',
  label: 'Tester',
  family: 'ground_herbivore',
  movementType: 'walk',
  assetId: 'animal.tester',
  affinities: [],
  homeRadius: 3,
  population: { min: 1, max: 1 },
  preferredTerrain: ['grass'],
  activityWindow: 'always',
  behavior: {
    family: 'ground_herbivore',
    states: ['idle', 'walking', 'sleeping'],
    restChance: 0.3,
    spawn: { preferNearVegetation: false, preferRadius: 1 },
    timers: { idleMin: 120, idleMax: 300, walkMin: 5, walkMax: 15, sleepMin: 60, sleepMax: 180 },
  },
};

function agentAt(x: number, y: number): AnimalAgent {
  const animal: IAnimal = {
    id: 'm-1',
    species: 'tester',
    tileX: x,
    tileY: y,
    homeTileX: x,
    homeTileY: y,
    createdAtBloomDay: 0,
    state: 'walking',
    facing: 'south',
    ageDays: 0,
  };
  return { animal, config: cfg, intent: null, acted: true };
}

describe('MovementSystem', () => {
  beforeEach(() => terrainService.clearReservations());

  it('applies a legal one-tile step', () => {
    const g = grid();
    const a = agentAt(2, 2);
    a.intent = { x: 3, y: 2, facing: 'east' };
    expect(movementSystem.apply(a, g)).toBe(true);
    expect([a.animal.tileX, a.animal.tileY]).toEqual([3, 2]);
    expect(a.animal.facing).toBe('east');
    expect(a.intent).toBeNull();
  });

  it('never teleports: rejects non-adjacent intents and settles to idle', () => {
    const g = grid();
    const a = agentAt(2, 2);
    a.intent = { x: 4, y: 2, facing: 'east' };
    expect(movementSystem.apply(a, g)).toBe(false);
    expect([a.animal.tileX, a.animal.tileY]).toEqual([2, 2]);
    expect(a.animal.state).toBe('idle');
  });

  it('never enters water', () => {
    let g = grid();
    g = terrainService.setTerrain(g, 2, 1, 'water');
    const a = agentAt(2, 2);
    a.intent = { x: 2, y: 1, facing: 'north' };
    expect(movementSystem.apply(a, g)).toBe(false);
    expect([a.animal.tileX, a.animal.tileY]).toEqual([2, 2]);
  });

  it('never enters reserved terrain', () => {
    const g = grid();
    terrainService.reserve(2, 3);
    const a = agentAt(2, 2);
    a.intent = { x: 2, y: 3, facing: 'south' };
    expect(movementSystem.apply(a, g)).toBe(false);
  });

  it('does nothing without an intent', () => {
    const a = agentAt(2, 2);
    expect(movementSystem.apply(a, grid())).toBe(false);
  });
});
