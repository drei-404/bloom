import { describe, it, expect, vi } from 'vitest';

// Fireflies participate in the existing native/discovery system; mock the gate
// so PopulationManager runs without the ecosystem stack.
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
import '../../wildlife/movement/registerStrategies'; // fly strategy
import { firefliesPack } from '../packs/fireflies.pack';
import { butterflyPack } from '../packs/butterfly.pack';
import { speciesRegistry } from '../../wildlife/species/SpeciesRegistry';
import { assetRegistry } from '../../assets/AssetRegistry';
import { animalRegistry } from '../../animal/AnimalRegistry';
import { populationManager } from '../../wildlife/PopulationManager';
import { selectNativeSpecies } from '../../ecosystem/nativeSelection';

firefliesPack.register();
butterflyPack.register(); // to assert butterfly (flying) stays unchanged

const identity: WorldIdentity = {
  worldUuid: 'BLOOM-WLD-0000FL13',
  worldName: 'Test',
  worldSeed: 1414213,
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
    // Night so the species' activity window is irrelevant to spawning; spawn is
    // schedule-independent and matches every other species.
    timeOfDay: 0.0,
  };
}

describe('FirefliesPack registration', () => {
  it('registers species, asset and affinity from one pack', () => {
    const f = speciesRegistry.resolve('fireflies');
    expect(f?.family).toBe('flying');
    expect(f?.movementType).toBe('fly');
    expect(f?.homeRadius).toBe(7);
    expect(f?.population).toEqual({ min: 8, max: 15 });
    expect(f?.activityWindow).toBe('night');
    expect(f?.preferredTerrain).toEqual(['grass']);

    expect(assetRegistry.has('animal.fireflies')).toBe(true);
    expect(assetRegistry.get('animal.fireflies')?.metadata).toEqual({
      body: 0x4a4a4a,
      dark: 0xf5f0a0,
    });
    expect(animalRegistry.get('fireflies')?.affinities).toEqual(['wetland']);
  });

  it('inherits flying family behaviour — no duplicated behaviour code', () => {
    const fireflies = speciesRegistry.resolve('fireflies');
    const butterfly = speciesRegistry.resolve('butterfly');
    expect(fireflies?.behavior).toEqual(butterfly?.behavior); // same shared family behaviour
    expect(fireflies?.behavior.restChance).toBe(0.15);
  });
});

describe('Fireflies native selection + spawning', () => {
  it('is a selectable native for wetland worlds', () => {
    const wetlandPool = animalRegistry.all().filter(d => d.affinities.includes('wetland'));
    expect(wetlandPool.some(d => d.species === 'fireflies')).toBe(true);
    // Deterministic selection is stable.
    const a = selectNativeSpecies(identity, 'wetland', animalRegistry.all());
    const b = selectNativeSpecies(identity, 'wetland', animalRegistry.all());
    expect(a).toEqual(b);
  });

  it('spawns deterministically, growing to its population cap', () => {
    // discoveredBloomDay is mocked to 15; population grows one per Bloom Day.
    expect(populationManager.spawn([], ctx(15)).filter(a => a.species === 'fireflies')).toHaveLength(1);
    // min band is 8 but growth is one-per-day from discovery; cap of 15 reached at day 29.
    expect(populationManager.spawn([], ctx(29)).filter(a => a.species === 'fireflies')).toHaveLength(15);
    expect(populationManager.spawn([], ctx(50)).filter(a => a.species === 'fireflies')).toHaveLength(15);

    const a = populationManager.spawn([], ctx(29)).filter(x => x.species === 'fireflies');
    const b = populationManager.spawn([], ctx(29)).filter(x => x.species === 'fireflies');
    expect(a).toEqual(b);
    // Home tile fixed at spawn.
    for (const animal of a) {
      expect(animal.homeTileX).toBe(animal.tileX);
      expect(animal.homeTileY).toBe(animal.tileY);
    }
  });
});

describe('Butterfly unchanged by adding Fireflies', () => {
  it('keeps flying family + fly movement + day schedule', () => {
    const butterfly = speciesRegistry.resolve('butterfly');
    expect(butterfly?.family).toBe('flying');
    expect(butterfly?.movementType).toBe('fly');
    expect(butterfly?.activityWindow).toBe('day');
    expect(butterfly?.behavior.restChance).toBe(0.15);
  });
});
