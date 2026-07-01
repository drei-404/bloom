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
import '../../wildlife/families/flying'; // engine family (dependency)
import '../../wildlife/families/groundHerbivore'; // ground species (regression check)
import '../../wildlife/movement/registerStrategies'; // walk + fly strategies
import { owlPack } from '../packs/owl.pack';
import { woodpeckerPack } from '../packs/woodpecker.pack';
import { butterflyPack } from '../packs/butterfly.pack';
import { rabbitPack } from '../packs/rabbit.pack';
import { deerPack } from '../packs/deer.pack';
import { hedgehogPack } from '../packs/hedgehog.pack';
import { squirrelPack } from '../packs/squirrel.pack';
import { beaverPack } from '../packs/beaver.pack';
import { speciesRegistry } from '../../wildlife/species/SpeciesRegistry';
import { assetRegistry } from '../../assets/AssetRegistry';
import { animalRegistry } from '../../animal/AnimalRegistry';
import { populationManager } from '../../wildlife/PopulationManager';
import { selectNativeSpecies } from '../../ecosystem/nativeSelection';

// Register the new flyers plus every earlier pack (for regression assertions).
owlPack.register();
woodpeckerPack.register();
butterflyPack.register();
rabbitPack.register();
deerPack.register();
hedgehogPack.register();
squirrelPack.register();
beaverPack.register();

const identity: WorldIdentity = {
  worldUuid: 'BLOOM-WLD-000FLY02',
  worldName: 'Test',
  worldSeed: 5772156,
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
  { species: 'owl', homeRadius: 7, activity: 'night', max: 2, capDay: 16 },
  { species: 'woodpecker', homeRadius: 5, activity: 'day', max: 3, capDay: 17 },
] as const;

describe('Flying packs (owl, woodpecker) — registration', () => {
  for (const s of NEW_SPECIES) {
    it(`${s.species} registers species, asset and affinity from one pack`, () => {
      const def = speciesRegistry.resolve(s.species);
      expect(def?.family).toBe('flying');
      expect(def?.movementType).toBe('fly');
      expect(def?.homeRadius).toBe(s.homeRadius);
      expect(def?.activityWindow).toBe(s.activity);
      expect(def?.preferredTerrain).toEqual(['grass']);
      expect(def?.population.max).toBe(s.max);

      expect(assetRegistry.has(`animal.${s.species}`)).toBe(true);
      expect(animalRegistry.get(s.species)?.affinities).toEqual(['forest']);
    });
  }

  it('both inherit the flying family exactly — no duplicated/custom behaviour', () => {
    const butterfly = speciesRegistry.resolve('butterfly');
    for (const s of NEW_SPECIES) {
      const def = speciesRegistry.resolve(s.species);
      expect(def?.behavior).toEqual(butterfly?.behavior); // identical shared flying behaviour
      expect(def?.behavior.family).toBe('flying');
      expect(def?.behavior.restChance).toBe(0.15);
    }
  });
});

describe('Flying packs — deterministic native selection', () => {
  for (const s of NEW_SPECIES) {
    it(`${s.species} is a selectable native for forest worlds`, () => {
      const pool = animalRegistry.all().filter(d => d.affinities.includes('forest'));
      expect(pool.some(d => d.species === s.species)).toBe(true);
      const a = selectNativeSpecies(identity, 'forest', animalRegistry.all());
      const b = selectNativeSpecies(identity, 'forest', animalRegistry.all());
      expect(a).toEqual(b);
    });
  }
});

describe('Flying packs — deterministic spawning', () => {
  for (const s of NEW_SPECIES) {
    it(`${s.species} spawns deterministically, growing to its population cap`, () => {
      // discoveredBloomDay is mocked to 15; population grows one per Bloom Day.
      expect(populationManager.spawn([], ctx(15)).filter(a => a.species === s.species)).toHaveLength(1);
      expect(populationManager.spawn([], ctx(s.capDay)).filter(a => a.species === s.species)).toHaveLength(s.max);
      expect(populationManager.spawn([], ctx(50)).filter(a => a.species === s.species)).toHaveLength(s.max);

      const a = populationManager.spawn([], ctx(s.capDay)).filter(x => x.species === s.species);
      const b = populationManager.spawn([], ctx(s.capDay)).filter(x => x.species === s.species);
      expect(a).toEqual(b);
      for (const animal of a) {
        expect(animal.homeTileX).toBe(animal.tileX);
        expect(animal.homeTileY).toBe(animal.tileY);
      }
    });
  }
});

describe('No regression for prior species', () => {
  it('rabbit, deer, butterfly keep their metadata', () => {
    expect(speciesRegistry.resolve('rabbit')?.activityWindow).toBe('always');
    expect(speciesRegistry.resolve('deer')?.homeRadius).toBe(6);
    const butterfly = speciesRegistry.resolve('butterfly');
    expect(butterfly?.family).toBe('flying');
    expect(butterfly?.movementType).toBe('fly');
  });

  it('hedgehog, squirrel, beaver keep their metadata + ground behaviour', () => {
    const rabbit = speciesRegistry.resolve('rabbit');
    for (const species of ['hedgehog', 'squirrel', 'beaver'] as const) {
      const def = speciesRegistry.resolve(species);
      expect(def?.family).toBe('ground_herbivore');
      expect(def?.movementType).toBe('walk');
      expect(def?.behavior).toEqual(rabbit?.behavior);
    }
    expect(speciesRegistry.resolve('hedgehog')?.activityWindow).toBe('night');
    expect(speciesRegistry.resolve('squirrel')?.homeRadius).toBe(5);
    expect(speciesRegistry.resolve('beaver')?.affinities).toEqual(['wetland']);
  });
});
