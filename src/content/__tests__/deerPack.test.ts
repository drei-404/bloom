import { describe, it, expect, vi } from 'vitest';

// Deer participates in the existing native/discovery system; mock the gate so
// PopulationManager runs without the ecosystem stack.
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
import { deerPack } from '../packs/deer.pack';
import { rabbitPack } from '../packs/rabbit.pack';
import { speciesRegistry } from '../../wildlife/species/SpeciesRegistry';
import { assetRegistry } from '../../assets/AssetRegistry';
import { animalRegistry } from '../../animal/AnimalRegistry';
import { populationManager } from '../../wildlife/PopulationManager';
import { selectNativeSpecies } from '../../ecosystem/nativeSelection';

deerPack.register();
rabbitPack.register(); // to assert rabbit stays unchanged

const identity: WorldIdentity = {
  worldUuid: 'BLOOM-WLD-0000D33R',
  worldName: 'Test',
  worldSeed: 3141592,
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

describe('DeerPack registration', () => {
  it('registers species, asset and affinity from one pack', () => {
    const deer = speciesRegistry.resolve('deer');
    expect(deer?.family).toBe('ground_herbivore');
    expect(deer?.movementType).toBe('walk');
    expect(deer?.homeRadius).toBe(6);
    expect(deer?.population).toEqual({ min: 1, max: 2 });
    expect(deer?.activityWindow).toBe('day');
    expect(deer?.preferredTerrain).toEqual(['grass']);

    expect(assetRegistry.has('animal.deer')).toBe(true);
    expect(animalRegistry.get('deer')?.affinities).toEqual(['meadow', 'forest']);
  });

  it('inherits ground_herbivore behaviour — no duplicated behaviour code', () => {
    const deer = speciesRegistry.resolve('deer');
    const rabbit = speciesRegistry.resolve('rabbit');
    expect(deer?.behavior).toEqual(rabbit?.behavior); // same shared family behaviour
  });
});

describe('Deer native selection + spawning', () => {
  it('is a selectable native for forest/meadow worlds', () => {
    const forestPool = animalRegistry.all().filter(d => d.affinities.includes('forest'));
    expect(forestPool.some(d => d.species === 'deer')).toBe(true);
    // Deterministic selection is stable.
    const a = selectNativeSpecies(identity, 'forest', animalRegistry.all());
    const b = selectNativeSpecies(identity, 'forest', animalRegistry.all());
    expect(a).toEqual(b);
  });

  it('spawns deterministically, growing to its population cap', () => {
    expect(populationManager.spawn([], ctx(15)).filter(a => a.species === 'deer')).toHaveLength(1);
    expect(populationManager.spawn([], ctx(16)).filter(a => a.species === 'deer')).toHaveLength(2);
    expect(populationManager.spawn([], ctx(50)).filter(a => a.species === 'deer')).toHaveLength(2);

    const a = populationManager.spawn([], ctx(16)).filter(x => x.species === 'deer');
    const b = populationManager.spawn([], ctx(16)).filter(x => x.species === 'deer');
    expect(a).toEqual(b);
    // Home tile fixed at spawn.
    for (const d of a) {
      expect(d.homeTileX).toBe(d.tileX);
      expect(d.homeTileY).toBe(d.tileY);
    }
  });
});

describe('Rabbit unchanged by adding Deer', () => {
  it('keeps its own metadata + behaviour', () => {
    const rabbit = speciesRegistry.resolve('rabbit');
    expect(rabbit?.homeRadius).toBe(3);
    expect(rabbit?.activityWindow).toBe('always');
    expect(rabbit?.population.max).toBe(3);
    expect(rabbit?.behavior.restChance).toBe(0.3);
  });
});
