import { describe, it, expect, vi } from 'vitest';

// Butterfly participates in the existing native/discovery system; mock the gate
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
import '../../wildlife/families/groundHerbivore'; // rabbit/deer family (unchanged-check)
import '../../wildlife/movement/registerStrategies'; // registers the `fly` strategy
import { butterflyPack } from '../packs/butterfly.pack';
import { rabbitPack } from '../packs/rabbit.pack';
import { deerPack } from '../packs/deer.pack';
import { speciesRegistry } from '../../wildlife/species/SpeciesRegistry';
import { assetRegistry } from '../../assets/AssetRegistry';
import { animalRegistry } from '../../animal/AnimalRegistry';
import { movementStrategyRegistry } from '../../wildlife/movement/MovementStrategyRegistry';
import { populationManager } from '../../wildlife/PopulationManager';
import { selectNativeSpecies } from '../../ecosystem/nativeSelection';

butterflyPack.register();
rabbitPack.register(); // to assert rabbit stays unchanged
deerPack.register(); // to assert deer stays unchanged

const identity: WorldIdentity = {
  worldUuid: 'BLOOM-WLD-0000FLY0',
  worldName: 'Test',
  worldSeed: 2718281,
  createdAt: 0,
  bloomVersion: '0.1.0',
};

// Grid with a pond in the middle: proves flyers spawn/traverse over water while
// walkers cannot. `size` bounds the island; anything outside is out of bounds.
function grid(size = 8): TileGrid {
  const tiles: TileData[] = [];
  for (let col = 0; col < size; col++) {
    for (let row = 0; row < size; row++) {
      const isPond = col === 4 && row === 4;
      tiles.push({
        col,
        row,
        grassLevel: isPond ? 0 : 1,
        terrainType: isPond ? 'water' : 'grass',
      });
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

describe('ButterflyPack registration', () => {
  it('registers species, asset and affinity from one pack', () => {
    const butterfly = speciesRegistry.resolve('butterfly');
    expect(butterfly?.family).toBe('flying');
    expect(butterfly?.movementType).toBe('fly');
    expect(butterfly?.homeRadius).toBe(8);
    expect(butterfly?.population).toEqual({ min: 4, max: 8 });
    expect(butterfly?.activityWindow).toBe('day');
    expect(butterfly?.preferredTerrain).toEqual(['grass']);

    expect(assetRegistry.has('animal.butterfly')).toBe(true);
    expect(animalRegistry.get('butterfly')?.affinities).toEqual(['meadow']);
  });

  it('inherits flying behaviour — no custom/duplicated behaviour code', () => {
    const butterfly = speciesRegistry.resolve('butterfly');
    // Behaviour comes entirely from the shared flying family.
    expect(butterfly?.behavior.family).toBe('flying');
    expect(butterfly?.behavior.restChance).toBe(0.15);
    // Distinct from the ground family — proves it is the flying family, not ground.
    const deer = speciesRegistry.resolve('deer');
    expect(butterfly?.behavior).not.toEqual(deer?.behavior);
  });
});

describe('Butterfly native selection + spawning', () => {
  it('is a selectable native for meadow worlds', () => {
    const meadowPool = animalRegistry.all().filter(d => d.affinities.includes('meadow'));
    expect(meadowPool.some(d => d.species === 'butterfly')).toBe(true);
    // Deterministic selection is stable.
    const a = selectNativeSpecies(identity, 'meadow', animalRegistry.all());
    const b = selectNativeSpecies(identity, 'meadow', animalRegistry.all());
    expect(a).toEqual(b);
  });

  it('spawns deterministically, growing to its population cap', () => {
    // discoveredBloomDay is mocked to 15; population grows one per Bloom Day.
    expect(populationManager.spawn([], ctx(15)).filter(a => a.species === 'butterfly')).toHaveLength(1);
    expect(populationManager.spawn([], ctx(22)).filter(a => a.species === 'butterfly')).toHaveLength(8);
    expect(populationManager.spawn([], ctx(50)).filter(a => a.species === 'butterfly')).toHaveLength(8);

    const a = populationManager.spawn([], ctx(22)).filter(x => x.species === 'butterfly');
    const b = populationManager.spawn([], ctx(22)).filter(x => x.species === 'butterfly');
    expect(a).toEqual(b);
    // Home tile fixed at spawn.
    for (const bf of a) {
      expect(bf.homeTileX).toBe(bf.tileX);
      expect(bf.homeTileY).toBe(bf.tileY);
    }
  });

  it('may spawn over water — flyers are not confined to grass', () => {
    // 8×8 grid = 64 tiles all spawnable to a flyer (incl. the pond); population
    // caps at 8, so a spawn-over-water requires no assertion beyond tile legality.
    const strategy = movementStrategyRegistry.get('fly');
    const spawnable = strategy.spawnTiles(ctx(22).tileGrid, []);
    expect(spawnable).toContainEqual({ x: 4, y: 4 }); // the pond tile is spawnable
  });
});

describe('Butterfly flies across ponds and respects island bounds', () => {
  it('traverses water and vegetation, and stops at the island edge', () => {
    const strategy = movementStrategyRegistry.get('fly');
    const g = grid();
    // Crosses the pond (water) — walkers cannot.
    expect(strategy.canTraverse(g, 4, 4, [])).toBe(true);
    expect(strategy.canOccupy(g, 4, 4)).toBe(true);
    // Crosses ordinary grass/vegetation tiles too.
    expect(strategy.canTraverse(g, 0, 0, [])).toBe(true);
    // Respects island boundaries: out-of-bounds is never traversable/occupiable.
    expect(strategy.canTraverse(g, -1, 0, [])).toBe(false);
    expect(strategy.canTraverse(g, 8, 8, [])).toBe(false);
    expect(strategy.canOccupy(g, 8, 8)).toBe(false);
  });
});

describe('Rabbit and Deer unchanged by adding Butterfly', () => {
  it('rabbit keeps its own metadata + behaviour', () => {
    const rabbit = speciesRegistry.resolve('rabbit');
    expect(rabbit?.movementType).toBe('walk');
    expect(rabbit?.homeRadius).toBe(3);
    expect(rabbit?.activityWindow).toBe('always');
    expect(rabbit?.behavior.restChance).toBe(0.3);
  });

  it('deer keeps its own metadata + behaviour', () => {
    const deer = speciesRegistry.resolve('deer');
    expect(deer?.movementType).toBe('walk');
    expect(deer?.homeRadius).toBe(6);
    expect(deer?.activityWindow).toBe('day');
  });
});
