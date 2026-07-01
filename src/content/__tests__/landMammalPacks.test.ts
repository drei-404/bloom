import { describe, it, expect, vi } from 'vitest';

// Fox and Bear participate in the existing native/discovery system; mock the
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
import '../../wildlife/movement/registerStrategies'; // walk strategy
import { foxPack } from '../packs/fox.pack';
import { bearPack } from '../packs/bear.pack';
import { rabbitPack } from '../packs/rabbit.pack';
import { deerPack } from '../packs/deer.pack';
import { speciesRegistry } from '../../wildlife/species/SpeciesRegistry';
import { assetRegistry } from '../../assets/AssetRegistry';
import { animalRegistry } from '../../animal/AnimalRegistry';
import { populationManager } from '../../wildlife/PopulationManager';
import { selectNativeSpecies } from '../../ecosystem/nativeSelection';

// Register the new packs plus earlier ones (for regression assertions).
foxPack.register();
bearPack.register();
rabbitPack.register();
deerPack.register();

const identity: WorldIdentity = {
  worldUuid: 'BLOOM-WLD-0000F0XB',
  worldName: 'Test',
  worldSeed: 2718281,
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
  {
    species: 'fox',
    label: 'Fox',
    affinities: ['meadow', 'forest'],
    homeRadius: 6,
    max: 2,
    capDay: 16,
    body: 0xe8792b,
    dark: 0x7a3b12,
  },
  {
    species: 'bear',
    label: 'Bear',
    affinities: ['forest'],
    homeRadius: 8,
    max: 1,
    capDay: 15,
    body: 0x5c3a21,
    dark: 0x2e1c10,
  },
] as const;

describe('Land mammal packs — registration', () => {
  for (const s of NEW_SPECIES) {
    it(`${s.species} registers species, asset and affinity from one pack`, () => {
      const def = speciesRegistry.resolve(s.species);
      expect(def?.family).toBe('ground_herbivore');
      expect(def?.movementType).toBe('walk');
      expect(def?.homeRadius).toBe(s.homeRadius);
      expect(def?.activityWindow).toBe('day');
      expect(def?.preferredTerrain).toEqual(['grass']);
      expect(def?.population).toEqual({ min: 1, max: s.max });

      expect(assetRegistry.has(`animal.${s.species}`)).toBe(true);
      expect(assetRegistry.get(`animal.${s.species}`)?.metadata).toEqual({
        body: s.body,
        dark: s.dark,
      });
      expect(animalRegistry.get(s.species)?.affinities).toEqual([...s.affinities]);
    });
  }

  it('both inherit ground_herbivore behaviour — no duplicated behaviour code', () => {
    const rabbit = speciesRegistry.resolve('rabbit');
    for (const s of NEW_SPECIES) {
      const def = speciesRegistry.resolve(s.species);
      expect(def?.behavior).toEqual(rabbit?.behavior); // identical shared family behaviour
      expect(def?.behavior.restChance).toBe(0.3);
    }
  });
});

describe('Land mammal packs — affinity selection', () => {
  for (const s of NEW_SPECIES) {
    for (const affinity of s.affinities) {
      it(`${s.species} is a selectable native for ${affinity} worlds`, () => {
        const pool = animalRegistry.all().filter(d => d.affinities.includes(affinity));
        expect(pool.some(d => d.species === s.species)).toBe(true);
        // Deterministic selection is stable.
        const a = selectNativeSpecies(identity, affinity, animalRegistry.all());
        const b = selectNativeSpecies(identity, affinity, animalRegistry.all());
        expect(a).toEqual(b);
      });
    }
  }
});

describe('Land mammal packs — deterministic spawning', () => {
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

describe('No regression for Rabbit and Deer', () => {
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
});
