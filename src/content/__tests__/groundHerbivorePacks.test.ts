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
import '../../wildlife/families/groundHerbivore'; // engine family (dependency)
import '../../wildlife/families/flying'; // butterfly family (regression check)
import '../../wildlife/movement/registerStrategies'; // walk + fly strategies
import { hedgehogPack } from '../packs/hedgehog.pack';
import { squirrelPack } from '../packs/squirrel.pack';
import { beaverPack } from '../packs/beaver.pack';
import { rabbitPack } from '../packs/rabbit.pack';
import { deerPack } from '../packs/deer.pack';
import { butterflyPack } from '../packs/butterfly.pack';
import { speciesRegistry } from '../../wildlife/species/SpeciesRegistry';
import { assetRegistry } from '../../assets/AssetRegistry';
import { animalRegistry } from '../../animal/AnimalRegistry';
import { populationManager } from '../../wildlife/PopulationManager';
import { selectNativeSpecies } from '../../ecosystem/nativeSelection';

// Register the new packs plus the earlier ones (for regression assertions).
hedgehogPack.register();
squirrelPack.register();
beaverPack.register();
rabbitPack.register();
deerPack.register();
butterflyPack.register();

const identity: WorldIdentity = {
  worldUuid: 'BLOOM-WLD-0000HERB',
  worldName: 'Test',
  worldSeed: 1618033,
  createdAt: 0,
  bloomVersion: '0.1.0',
};

function grid(size = 8): TileGrid {
  const tiles: TileData[] = [];
  for (let col = 0; col < size; col++) {
    for (let row = 0; row < size; row++) {
      tiles.push({ col, row, grassLevel: 1, terrainType: 'grass' });
    }
  }
  return { size, tiles };
}

function ctx(bloomDays: number): WildlifeContext {
  return {
    animals: [],
    tileGrid: grid(),
    staticOccupants: [],
    vegetation: [],
    identity,
    bloomDays,
    nowMs: 0,
    timeOfDay: 0.5,
  };
}

const NEW_SPECIES = [
  { species: 'hedgehog', affinity: 'meadow', homeRadius: 3, activity: 'night', max: 2, capDay: 16 },
  { species: 'squirrel', affinity: 'forest', homeRadius: 5, activity: 'day', max: 5, capDay: 19 },
  { species: 'beaver', affinity: 'wetland', homeRadius: 4, activity: 'day', max: 3, capDay: 17 },
] as const;

describe('Ground herbivore packs — registration', () => {
  for (const s of NEW_SPECIES) {
    it(`${s.species} registers species, asset and affinity from one pack`, () => {
      const def = speciesRegistry.resolve(s.species);
      expect(def?.family).toBe('ground_herbivore');
      expect(def?.movementType).toBe('walk');
      expect(def?.homeRadius).toBe(s.homeRadius);
      expect(def?.activityWindow).toBe(s.activity);
      expect(def?.preferredTerrain).toEqual(['grass']);
      expect(def?.population.max).toBe(s.max);

      expect(assetRegistry.has(`animal.${s.species}`)).toBe(true);
      expect(animalRegistry.get(s.species)?.affinities).toEqual([s.affinity]);
    });
  }

  it('all three inherit ground_herbivore behaviour — no duplicated behaviour code', () => {
    const rabbit = speciesRegistry.resolve('rabbit');
    for (const s of NEW_SPECIES) {
      const def = speciesRegistry.resolve(s.species);
      expect(def?.behavior).toEqual(rabbit?.behavior); // identical shared family behaviour
      expect(def?.behavior.restChance).toBe(0.3);
    }
  });
});

describe('Ground herbivore packs — affinity selection', () => {
  for (const s of NEW_SPECIES) {
    it(`${s.species} is a selectable native for ${s.affinity} worlds`, () => {
      const pool = animalRegistry.all().filter(d => d.affinities.includes(s.affinity));
      expect(pool.some(d => d.species === s.species)).toBe(true);
      // Deterministic selection is stable.
      const a = selectNativeSpecies(identity, s.affinity, animalRegistry.all());
      const b = selectNativeSpecies(identity, s.affinity, animalRegistry.all());
      expect(a).toEqual(b);
    });
  }
});

describe('Ground herbivore packs — deterministic spawning', () => {
  for (const s of NEW_SPECIES) {
    it(`${s.species} spawns deterministically, growing to its population cap`, () => {
      // discoveredBloomDay is mocked to 15; population grows one per Bloom Day.
      expect(populationManager.spawn([], ctx(15)).filter(a => a.species === s.species)).toHaveLength(1);
      expect(populationManager.spawn([], ctx(s.capDay)).filter(a => a.species === s.species)).toHaveLength(s.max);
      expect(populationManager.spawn([], ctx(50)).filter(a => a.species === s.species)).toHaveLength(s.max);

      const a = populationManager.spawn([], ctx(s.capDay)).filter(x => x.species === s.species);
      const b = populationManager.spawn([], ctx(s.capDay)).filter(x => x.species === s.species);
      expect(a).toEqual(b);
      // Home tile fixed at spawn.
      for (const animal of a) {
        expect(animal.homeTileX).toBe(animal.tileX);
        expect(animal.homeTileY).toBe(animal.tileY);
      }
    });
  }
});

describe('No regression for Rabbit, Deer and Butterfly', () => {
  it('rabbit keeps its own metadata + behaviour', () => {
    const rabbit = speciesRegistry.resolve('rabbit');
    expect(rabbit?.homeRadius).toBe(3);
    expect(rabbit?.activityWindow).toBe('always');
    expect(rabbit?.population.max).toBe(3);
    expect(rabbit?.behavior.restChance).toBe(0.3);
  });

  it('deer keeps its own metadata + behaviour', () => {
    const deer = speciesRegistry.resolve('deer');
    expect(deer?.homeRadius).toBe(6);
    expect(deer?.activityWindow).toBe('day');
    expect(deer?.affinities).toEqual(['meadow', 'forest']);
  });

  it('butterfly keeps flying family + fly movement', () => {
    const butterfly = speciesRegistry.resolve('butterfly');
    expect(butterfly?.family).toBe('flying');
    expect(butterfly?.movementType).toBe('fly');
    expect(butterfly?.behavior.restChance).toBe(0.15);
  });
});
