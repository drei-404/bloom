import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the discovery gate so PopulationManager runs without the ecosystem stack.
vi.mock('../../ecosystem/NativeSpeciesService', () => ({
  nativeSpeciesService: {
    isDiscovered: vi.fn(() => true),
    discoveredBloomDay: vi.fn(() => 15),
  },
}));

import type { TileGrid, TileData } from '../../types/tile';
import type { WorldIdentity } from '../../types/identity';
import type { IAnimal } from '../../animal/IAnimal';
import type { WildlifeContext } from '../types';
import { terrainService } from '../../terrain/TerrainService';
import { nativeSpeciesService } from '../../ecosystem/NativeSpeciesService';
import { populationManager } from '../PopulationManager';
import '../species/rabbit'; // register rabbit config

function grid(size = 8): TileGrid {
  const tiles: TileData[] = [];
  for (let col = 0; col < size; col++) {
    for (let row = 0; row < size; row++) {
      tiles.push({ col, row, grassLevel: 1, terrainType: 'grass' });
    }
  }
  return { size, tiles };
}

const identity: WorldIdentity = {
  worldUuid: 'BLOOM-WLD-0000CAFE',
  worldName: 'Test',
  worldSeed: 987654,
  createdAt: 0,
  bloomVersion: '0.1.0',
};

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

describe('PopulationManager', () => {
  beforeEach(() => {
    terrainService.clearReservations();
    vi.mocked(nativeSpeciesService.isDiscovered).mockReturnValue(true);
    vi.mocked(nativeSpeciesService.discoveredBloomDay).mockReturnValue(15);
  });

  it('grows population one per Bloom Day from discovery, capped at max', () => {
    expect(populationManager.spawn([], ctx(15)).filter(a => a.species === 'rabbit')).toHaveLength(1);
    expect(populationManager.spawn([], ctx(16)).filter(a => a.species === 'rabbit')).toHaveLength(2);
    expect(populationManager.spawn([], ctx(17)).filter(a => a.species === 'rabbit')).toHaveLength(3);
    expect(populationManager.spawn([], ctx(50)).filter(a => a.species === 'rabbit')).toHaveLength(3);
  });

  it('does not spawn undiscovered species', () => {
    vi.mocked(nativeSpeciesService.isDiscovered).mockReturnValue(false);
    expect(populationManager.spawn([], ctx(50))).toHaveLength(0);
  });

  it('is deterministic: same world + inputs yields identical placements', () => {
    const a = populationManager.spawn([], ctx(17));
    const b = populationManager.spawn([], ctx(17));
    expect(a).toEqual(b);
    // Stable ids in slot order.
    expect(a.map(r => r.id)).toEqual(['rabbit-0', 'rabbit-1', 'rabbit-2']);
  });

  it('respects existing animals and only tops up to target', () => {
    const existing: IAnimal[] = [
      {
        id: 'rabbit-0',
        species: 'rabbit',
        tileX: 0,
        tileY: 0,
        createdAtBloomDay: 15,
        state: 'idle',
        facing: 'south',
        ageDays: 0,
      },
    ];
    const out = populationManager.spawn(existing, ctx(16));
    expect(out.filter(a => a.species === 'rabbit')).toHaveLength(2);
    expect(out[0].id).toBe('rabbit-0'); // untouched
  });
});
