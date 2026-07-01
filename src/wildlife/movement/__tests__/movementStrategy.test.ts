import { describe, it, expect, beforeEach } from 'vitest';
import type { TileGrid, TileData } from '../../../types/tile';
import type { AnimalAgent, ResolvedSpecies } from '../../types';
import type { IAnimal } from '../../../animal/IAnimal';
import { terrainService } from '../../../terrain/TerrainService';
import { groundMovement } from '../GroundMovement';
import { flyingMovement } from '../FlyingMovement';
import { movementStrategyRegistry } from '../MovementStrategyRegistry';
import { movementSystem } from '../../MovementSystem';
import '../registerStrategies'; // registers walk + fly
import '../../families/flying'; // registers flying family
import { speciesRegistry } from '../../species/SpeciesRegistry';

function grid(size = 5): TileGrid {
  const tiles: TileData[] = [];
  for (let col = 0; col < size; col++) {
    for (let row = 0; row < size; row++) {
      tiles.push({ col, row, grassLevel: 1, terrainType: 'grass' });
    }
  }
  return { size, tiles };
}

describe('GroundMovement (unchanged walking rules)', () => {
  beforeEach(() => terrainService.clearReservations());

  it('walks on grass, never on water / reserved / occupied', () => {
    let g = grid();
    expect(groundMovement.canTraverse(g, 2, 2, [])).toBe(true);
    g = terrainService.setTerrain(g, 2, 1, 'water');
    expect(groundMovement.canTraverse(g, 2, 1, [])).toBe(false);
    terrainService.reserve(3, 3);
    expect(groundMovement.canTraverse(g, 3, 3, [])).toBe(false);
    expect(groundMovement.canTraverse(g, 2, 2, [{ tileX: 2, tileY: 2 }])).toBe(false);
  });

  it('spawns only on valid grass tiles', () => {
    const g = grid(3);
    expect(groundMovement.spawnTiles(g, []).length).toBe(9);
    expect(groundMovement.spawnTiles(g, [{ tileX: 0, tileY: 0 }]).length).toBe(8);
  });
});

describe('FlyingMovement', () => {
  beforeEach(() => terrainService.clearReservations());

  it('ignores obstacles, terrain and reservations — only bounds matter', () => {
    let g = grid();
    g = terrainService.setTerrain(g, 2, 1, 'water');
    terrainService.reserve(3, 3);
    expect(flyingMovement.canTraverse(g, 2, 1, [])).toBe(true); // over pond
    expect(flyingMovement.canTraverse(g, 3, 3, [])).toBe(true); // over reserved
    expect(flyingMovement.canTraverse(g, 2, 2, [{ tileX: 2, tileY: 2 }])).toBe(true); // over occupant
    expect(flyingMovement.canOccupy(g, 2, 1)).toBe(true); // may land-tile over water
  });

  it('stays inside island bounds', () => {
    const g = grid();
    expect(flyingMovement.canTraverse(g, -1, 0, [])).toBe(false);
    expect(flyingMovement.canTraverse(g, 0, 5, [])).toBe(false);
  });

  it('may spawn anywhere in bounds (including over water)', () => {
    let g = grid(4);
    g = terrainService.setTerrain(g, 1, 1, 'water');
    expect(flyingMovement.spawnTiles(g, []).length).toBe(16); // all tiles
  });
});

describe('MovementStrategyRegistry', () => {
  it('resolves registered strategies and falls back to ground', () => {
    expect(movementStrategyRegistry.get('walk')).toBe(groundMovement);
    expect(movementStrategyRegistry.get('fly')).toBe(flyingMovement);
    expect(movementStrategyRegistry.get('swim')).toBe(groundMovement); // fallback
  });
});

describe('flying family', () => {
  it('is registered beside ground_herbivore', () => {
    const fam = speciesRegistry.getFamily('flying');
    expect(fam).toBeDefined();
    expect(fam?.restChance).toBe(0.15);
  });
});

describe('MovementSystem drives flyers over the pond', () => {
  const flyingConfig: ResolvedSpecies = {
    species: 'flyer',
    label: 'Flyer',
    family: 'flying',
    movementType: 'fly',
    assetId: 'animal.flyer',
    affinities: [],
    homeRadius: 5,
    population: { min: 1, max: 1 },
    preferredTerrain: ['grass'],
    activityWindow: 'day',
    behavior: {
      family: 'flying',
      states: ['idle', 'walking', 'sleeping'],
      restChance: 0.15,
      spawn: { preferNearVegetation: false, preferRadius: 0 },
      timers: { idleMin: 60, idleMax: 150, walkMin: 5, walkMax: 20, sleepMin: 60, sleepMax: 180 },
    },
  };

  it('applies a one-tile step onto water (never teleports)', () => {
    let g = grid();
    g = terrainService.setTerrain(g, 2, 1, 'water');
    const animal: IAnimal = {
      id: 'f-1',
      species: 'flyer',
      tileX: 2,
      tileY: 2,
      homeTileX: 2,
      homeTileY: 2,
      createdAtBloomDay: 0,
      state: 'walking',
      facing: 'south',
      ageDays: 0,
    };
    const agent: AnimalAgent = { animal, config: flyingConfig, intent: { x: 2, y: 1, facing: 'north' }, acted: true };
    expect(movementSystem.apply(agent, g)).toBe(true);
    expect([animal.tileX, animal.tileY]).toEqual([2, 1]); // moved over water
  });
});
