import { describe, it, expect } from 'vitest';
import type { WorldIdentity } from '../../types/identity';
import type { EcosystemAffinity } from '../../types/ecosystem';
import { ECOSYSTEM_AFFINITIES } from '../../types/ecosystem';
import { animalRegistry } from '../../animal/AnimalRegistry';
import '../../animal/speciesCatalog'; // side-effect: populate the registry
import { selectAffinity, selectNativeSpecies, discoveryTarget } from '../nativeSelection';

function identity(seed: number): WorldIdentity {
  return {
    worldUuid: `BLOOM-WLD-${seed.toString(16).padStart(8, '0').toUpperCase()}`,
    worldName: 'Test World',
    worldSeed: seed,
    createdAt: 0,
    bloomVersion: '0.1.0',
  };
}

const catalog = animalRegistry.all();

describe('selectAffinity', () => {
  it('is deterministic for a given seed', () => {
    for (const seed of [1, 42, 9999, 2 ** 31]) {
      expect(selectAffinity(identity(seed))).toBe(selectAffinity(identity(seed)));
    }
  });

  it('only ever returns a known affinity', () => {
    for (let seed = 1; seed <= 50; seed++) {
      expect(ECOSYSTEM_AFFINITIES).toContain(selectAffinity(identity(seed)));
    }
  });

  it('does not collapse every world onto one ecosystem', () => {
    const seen = new Set<EcosystemAffinity>();
    for (let seed = 1; seed <= 60; seed++) seen.add(selectAffinity(identity(seed)));
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('selectNativeSpecies', () => {
  it('selects exactly four natives, all from the affinity pool, in slot order', () => {
    const id = identity(12345);
    const affinity = selectAffinity(id);
    const natives = selectNativeSpecies(id, affinity, catalog);

    expect(natives).toHaveLength(4);
    natives.forEach((n, i) => {
      expect(n.slot).toBe(i);
      expect(n.discovered).toBe(false);
      expect(n.discoveredBloomDay).toBeNull();
      const descriptor = catalog.find(d => d.species === n.species);
      expect(descriptor?.affinities).toContain(affinity);
    });
  });

  it('is stable: same identity yields the same natives every call', () => {
    const id = identity(777);
    const affinity = selectAffinity(id);
    const a = selectNativeSpecies(id, affinity, catalog);
    const b = selectNativeSpecies(id, affinity, catalog);
    expect(a).toEqual(b);
  });

  it('gives different worlds different native sets', () => {
    const sets = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const id = identity(seed);
      const natives = selectNativeSpecies(id, selectAffinity(id), catalog);
      sets.add(natives.map(n => n.species).join(','));
    }
    expect(sets.size).toBeGreaterThan(1);
  });
});

describe('discoveryTarget', () => {
  it('reveals nothing before the start day, then one every two Bloom Days', () => {
    const cases: Array<[number, number]> = [
      [0, 0],
      [14, 0],
      [15, 1],
      [16, 1],
      [17, 2],
      [18, 2],
      [19, 3],
      [21, 4],
      [23, 4], // capped at count
      [100, 4],
    ];
    for (const [bloomDays, expected] of cases) {
      expect(discoveryTarget(bloomDays, 4)).toBe(expected);
    }
  });

  it('never exceeds the available native count', () => {
    expect(discoveryTarget(1000, 2)).toBe(2);
    expect(discoveryTarget(1000, 0)).toBe(0);
  });
});
