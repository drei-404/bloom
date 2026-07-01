import { describe, it, expect, vi } from 'vitest';

// These species participate in the existing native/discovery system; mock the
// gate so PopulationManager runs without the ecosystem stack.
vi.mock('../../ecosystem/NativeSpeciesService', () => ({
  nativeSpeciesService: {
    isDiscovered: vi.fn(() => true),
    discoveredBloomDay: vi.fn(() => 15),
  },
}));

import type { TileGrid, TileData } from '../../types/tile';
import type { WorldIdentity } from '../../types/identity';
import type { WildlifeContext } from '../../wildlife/types';
import '../../wildlife/families/groundHerbivore'; // engine family (behaviour dependency)
import '../../wildlife/families/flying'; // for flyer regression checks
import '../../wildlife/movement/registerStrategies'; // walk + fly + swim strategies
import { duckPack } from '../packs/duck.pack';
import { goosePack } from '../packs/goose.pack';
import { frogPack } from '../packs/frog.pack';
import { turtlePack } from '../packs/turtle.pack';
import { otterPack } from '../packs/otter.pack';
import { rabbitPack } from '../packs/rabbit.pack';
import { deerPack } from '../packs/deer.pack';
import { butterflyPack } from '../packs/butterfly.pack';
import { hedgehogPack } from '../packs/hedgehog.pack';
import { squirrelPack } from '../packs/squirrel.pack';
import { beaverPack } from '../packs/beaver.pack';
import { owlPack } from '../packs/owl.pack';
import { woodpeckerPack } from '../packs/woodpecker.pack';
import { speciesRegistry } from '../../wildlife/species/SpeciesRegistry';
import { assetRegistry } from '../../assets/AssetRegistry';
import { animalRegistry } from '../../animal/AnimalRegistry';
import { movementStrategyRegistry } from '../../wildlife/movement/MovementStrategyRegistry';
import { waterMovement } from '../../wildlife/movement/WaterMovement';
import { terrainService } from '../../terrain/TerrainService';
import { populationManager } from '../../wildlife/PopulationManager';
import { selectNativeSpecies } from '../../ecosystem/nativeSelection';

// Register the water packs plus every earlier pack (for regression assertions).
duckPack.register();
goosePack.register();
frogPack.register();
turtlePack.register();
otterPack.register();
rabbitPack.register();
deerPack.register();
butterflyPack.register();
hedgehogPack.register();
squirrelPack.register();
beaverPack.register();
owlPack.register();
woodpeckerPack.register();

const identity: WorldIdentity = {
  worldUuid: 'BLOOM-WLD-0000WTR5',
  worldName: 'Test',
  worldSeed: 8675309,
  createdAt: 0,
  bloomVersion: '0.1.0',
};

/** Grid with a full water column at col 5 → a generous shoreline for spawning. */
function pondGrid(size = 10): TileGrid {
  const tiles: TileData[] = [];
  for (let col = 0; col < size; col++) {
    for (let row = 0; row < size; row++) {
      tiles.push({ col, row, grassLevel: col === 5 ? 0 : 1, terrainType: col === 5 ? 'water' : 'grass' });
    }
  }
  return { size, tiles };
}

/** All-grass grid — no pond yet (fallback spawning). */
function grassGrid(size = 8): TileGrid {
  const tiles: TileData[] = [];
  for (let col = 0; col < size; col++) {
    for (let row = 0; row < size; row++) {
      tiles.push({ col, row, grassLevel: 1, terrainType: 'grass' });
    }
  }
  return { size, tiles };
}

function ctx(bloomDays: number, grid = pondGrid()): WildlifeContext {
  return {
    animals: [],
    tileGrid: grid,
    staticOccupants: [],
    vegetation: [],
    identity,
    bloomDays,
    nowMs: 0,
    timeOfDay: 0.5,
  };
}

/** Whether a tile is water or touches water in its 8-neighbourhood. */
function nearWater(grid: TileGrid, x: number, y: number): boolean {
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (terrainService.terrainAt(grid, x + dx, y + dy) === 'water') return true;
    }
  }
  return false;
}

const WATER_SPECIES = [
  { species: 'duck', homeRadius: 5, activity: 'day', max: 4, capDay: 18 },
  { species: 'goose', homeRadius: 6, activity: 'day', max: 4, capDay: 18 },
  { species: 'frog', homeRadius: 3, activity: 'night', max: 6, capDay: 20 },
  { species: 'turtle', homeRadius: 3, activity: 'day', max: 2, capDay: 16 },
  { species: 'otter', homeRadius: 6, activity: 'day', max: 2, capDay: 16 },
] as const;

describe('Water packs — registration', () => {
  for (const s of WATER_SPECIES) {
    it(`${s.species} registers species, asset and affinity from one pack`, () => {
      const def = speciesRegistry.resolve(s.species);
      expect(def?.family).toBe('ground_herbivore');
      expect(def?.movementType).toBe('swim');
      expect(def?.homeRadius).toBe(s.homeRadius);
      expect(def?.activityWindow).toBe(s.activity);
      expect(def?.preferredTerrain).toEqual(['grass']);
      expect(def?.population.max).toBe(s.max);

      expect(assetRegistry.has(`animal.${s.species}`)).toBe(true);
      expect(animalRegistry.get(s.species)?.affinities).toEqual(['wetland']);
    });
  }

  it('all inherit ground_herbivore behaviour — no custom/duplicated behaviour code', () => {
    const rabbit = speciesRegistry.resolve('rabbit');
    for (const s of WATER_SPECIES) {
      const def = speciesRegistry.resolve(s.species);
      expect(def?.behavior).toEqual(rabbit?.behavior); // identical shared family behaviour
      expect(def?.behavior.restChance).toBe(0.3);
    }
  });

  it('resolve to the swim (water) movement strategy', () => {
    for (const s of WATER_SPECIES) {
      const def = speciesRegistry.resolve(s.species);
      expect(movementStrategyRegistry.get(def!.movementType)).toBe(waterMovement);
    }
  });
});

describe('Water packs — deterministic native selection', () => {
  for (const s of WATER_SPECIES) {
    it(`${s.species} is a selectable native for wetland worlds`, () => {
      const pool = animalRegistry.all().filter(d => d.affinities.includes('wetland'));
      expect(pool.some(d => d.species === s.species)).toBe(true);
      const a = selectNativeSpecies(identity, 'wetland', animalRegistry.all());
      const b = selectNativeSpecies(identity, 'wetland', animalRegistry.all());
      expect(a).toEqual(b);
    });
  }
});

describe('Water packs — deterministic spawning + water movement + pond edge', () => {
  it('grows each species to its cap and places every one on the shoreline', () => {
    const spawned = populationManager.spawn([], ctx(20)); // frog cap day; all others capped too
    for (const s of WATER_SPECIES) {
      expect(spawned.filter(a => a.species === s.species)).toHaveLength(s.max);
    }
    // Pond-edge spawning: every water animal sits on water or a tile adjacent to it.
    const grid = ctx(20).tileGrid;
    for (const s of WATER_SPECIES) {
      for (const a of spawned.filter(x => x.species === s.species)) {
        expect(nearWater(grid, a.tileX, a.tileY)).toBe(true);
        // Fixed home territory at spawn.
        expect(a.homeTileX).toBe(a.tileX);
        expect(a.homeTileY).toBe(a.tileY);
      }
    }
  });

  it('is deterministic — same identity yields identical spawns', () => {
    const a = populationManager.spawn([], ctx(20));
    const b = populationManager.spawn([], ctx(20));
    expect(a).toEqual(b);
  });

  it('falls back to normal grass spawning before a pond exists', () => {
    // No water in the grid → water animals spawn on ordinary grass, still capped.
    const spawned = populationManager.spawn([], ctx(20, grassGrid()));
    for (const s of WATER_SPECIES) {
      expect(spawned.filter(a => a.species === s.species)).toHaveLength(s.max);
    }
  });
});

describe('Water packs — no regression for existing species', () => {
  const EXISTING = [
    { species: 'rabbit', family: 'ground_herbivore', movement: 'walk' },
    { species: 'deer', family: 'ground_herbivore', movement: 'walk' },
    { species: 'hedgehog', family: 'ground_herbivore', movement: 'walk' },
    { species: 'squirrel', family: 'ground_herbivore', movement: 'walk' },
    { species: 'beaver', family: 'ground_herbivore', movement: 'walk' },
    { species: 'butterfly', family: 'flying', movement: 'fly' },
    { species: 'owl', family: 'flying', movement: 'fly' },
    { species: 'woodpecker', family: 'flying', movement: 'fly' },
  ] as const;

  for (const e of EXISTING) {
    it(`${e.species} keeps its family + movement`, () => {
      const def = speciesRegistry.resolve(e.species);
      expect(def?.family).toBe(e.family);
      expect(def?.movementType).toBe(e.movement);
    });
  }
});
