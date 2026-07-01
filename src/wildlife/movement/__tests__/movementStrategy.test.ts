import { describe, it, expect, beforeEach } from 'vitest';
import type { TileGrid, TileData } from '../../../types/tile';
import type { AnimalAgent, ResolvedSpecies } from '../../types';
import type { IAnimal } from '../../../animal/IAnimal';
import { terrainService } from '../../../terrain/TerrainService';
import { groundMovement } from '../GroundMovement';
import { flyingMovement } from '../FlyingMovement';
import { waterMovement } from '../WaterMovement';
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

describe('WaterMovement', () => {
  beforeEach(() => terrainService.clearReservations());

  it('is amphibious — crosses grass and water, never reserved / occupied', () => {
    let g = grid();
    g = terrainService.setTerrain(g, 2, 1, 'water');
    // Grass and water are both traversable — the shoreline is crossed naturally.
    expect(waterMovement.canTraverse(g, 2, 2, [])).toBe(true); // grass
    expect(waterMovement.canTraverse(g, 2, 1, [])).toBe(true); // water
    expect(waterMovement.canOccupy(g, 2, 1)).toBe(true); // may occupy water
    // Reserved (pending pond footprint) is invalid, even on grass.
    terrainService.reserve(3, 3);
    expect(waterMovement.canTraverse(g, 3, 3, [])).toBe(false);
    expect(waterMovement.canOccupy(g, 3, 3)).toBe(false);
    // Occupied tiles are blocked for traversal (no occupancy check on canOccupy).
    expect(waterMovement.canTraverse(g, 2, 2, [{ tileX: 2, tileY: 2 }])).toBe(false);
  });

  it('cannot leave the island', () => {
    let g = grid();
    g = terrainService.setTerrain(g, 0, 0, 'water');
    expect(waterMovement.canTraverse(g, -1, 0, [])).toBe(false);
    expect(waterMovement.canTraverse(g, 0, 5, [])).toBe(false);
    expect(waterMovement.canOccupy(g, 5, 5)).toBe(false);
  });

  it('is deterministic — same inputs give the same legality', () => {
    let g = grid();
    g = terrainService.setTerrain(g, 2, 1, 'water');
    expect(waterMovement.canTraverse(g, 2, 1, [])).toBe(waterMovement.canTraverse(g, 2, 1, []));
    expect(waterMovement.spawnTiles(g, [])).toEqual(waterMovement.spawnTiles(g, []));
  });

  it('prefers the pond edge when a pond exists (water + adjacent tiles only)', () => {
    let g = grid(5);
    g = terrainService.setTerrain(g, 2, 2, 'water'); // single-tile pond at centre
    const tiles = waterMovement.spawnTiles(g, []);
    // The pond tile plus its 8 neighbours = 9 shoreline tiles; nothing else.
    expect(tiles).toHaveLength(9);
    for (const t of tiles) {
      expect(Math.abs(t.x - 2) <= 1 && Math.abs(t.y - 2) <= 1).toBe(true);
    }
    expect(tiles).toContainEqual({ x: 2, y: 2 }); // the water tile itself
  });

  it('falls back to normal grass spawning before a pond exists', () => {
    const g = grid(4); // all grass, no water yet
    const tiles = waterMovement.spawnTiles(g, []);
    expect(tiles).toHaveLength(16); // every grass tile is spawnable
    // Occupied tiles are still excluded.
    expect(waterMovement.spawnTiles(g, [{ tileX: 0, tileY: 0 }])).toHaveLength(15);
  });
});

describe('MovementStrategyRegistry', () => {
  it('resolves registered strategies and falls back to ground', () => {
    expect(movementStrategyRegistry.get('walk')).toBe(groundMovement);
    expect(movementStrategyRegistry.get('fly')).toBe(flyingMovement);
    expect(movementStrategyRegistry.get('swim')).toBe(waterMovement);
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

describe('MovementSystem drives swimmers across the shoreline', () => {
  const swimConfig: ResolvedSpecies = {
    species: 'swimmer',
    label: 'Swimmer',
    family: 'ground_herbivore', // behaviour is irrelevant here; only movementType matters
    movementType: 'swim',
    assetId: 'animal.swimmer',
    affinities: [],
    homeRadius: 5,
    population: { min: 1, max: 1 },
    preferredTerrain: ['grass'],
    activityWindow: 'day',
    behavior: {
      family: 'ground_herbivore',
      states: ['idle', 'walking', 'sleeping'],
      restChance: 0.3,
      spawn: { preferNearVegetation: true, preferRadius: 2 },
      timers: { idleMin: 120, idleMax: 300, walkMin: 5, walkMax: 15, sleepMin: 60, sleepMax: 180 },
    },
  };

  function swimmer(x: number, y: number): IAnimal {
    return {
      id: 's-1',
      species: 'swimmer',
      tileX: x,
      tileY: y,
      homeTileX: x,
      homeTileY: y,
      createdAtBloomDay: 0,
      state: 'walking',
      facing: 'south',
      ageDays: 0,
    };
  }

  it('steps one tile from grass onto water, and back', () => {
    let g = grid();
    g = terrainService.setTerrain(g, 2, 1, 'water');

    const a = swimmer(2, 2);
    const enter: AnimalAgent = { animal: a, config: swimConfig, intent: { x: 2, y: 1, facing: 'north' }, acted: true };
    expect(movementSystem.apply(enter, g)).toBe(true);
    expect([a.tileX, a.tileY]).toEqual([2, 1]); // now on water

    const exit: AnimalAgent = { animal: a, config: swimConfig, intent: { x: 2, y: 2, facing: 'south' }, acted: true };
    expect(movementSystem.apply(exit, g)).toBe(true);
    expect([a.tileX, a.tileY]).toEqual([2, 2]); // back on grass
  });

  it('never teleports — a non-adjacent intent is refused', () => {
    let g = grid();
    g = terrainService.setTerrain(g, 0, 0, 'water');
    const a = swimmer(2, 2);
    const jump: AnimalAgent = { animal: a, config: swimConfig, intent: { x: 0, y: 0, facing: 'north' }, acted: true };
    expect(movementSystem.apply(jump, g)).toBe(false);
    expect([a.tileX, a.tileY]).toEqual([2, 2]); // did not move
    expect(a.state).toBe('idle');
  });
});
