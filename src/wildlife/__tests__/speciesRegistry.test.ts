import { describe, it, expect, beforeEach } from 'vitest';
import { speciesRegistry } from '../species/SpeciesRegistry';
import type { FamilyBehavior, SpeciesDefinition } from '../types';

const family: FamilyBehavior = {
  family: 'ground_herbivore',
  states: ['idle', 'walking', 'sleeping'],
  restChance: 0.3,
  spawn: { preferNearVegetation: true, preferRadius: 2 },
  timers: { idleMin: 120, idleMax: 300, walkMin: 5, walkMax: 15, sleepMin: 60, sleepMax: 180 },
};

const def: SpeciesDefinition = {
  species: 'testcritter',
  label: 'Test Critter',
  family: 'ground_herbivore',
  movementType: 'walk',
  assetId: 'animal.testcritter',
  affinities: ['meadow'],
  homeRadius: 4,
  population: { min: 1, max: 2 },
  preferredTerrain: ['grass'],
  activityWindow: 'always',
};

describe('SpeciesRegistry', () => {
  beforeEach(() => speciesRegistry.clear());

  it('validates species ids', () => {
    for (const ok of ['rabbit', 'red_fox', 'deer2']) expect(speciesRegistry.isValidId(ok)).toBe(true);
    for (const bad of ['Rabbit', '2deer', 'red-fox', 'a.b', '']) {
      expect(speciesRegistry.isValidId(bad)).toBe(false);
    }
  });

  it('rejects invalid species ids on register', () => {
    expect(() => speciesRegistry.register({ ...def, species: 'Bad Id' })).toThrow();
  });

  it('registers + looks up species definitions', () => {
    speciesRegistry.register(def);
    expect(speciesRegistry.has('testcritter')).toBe(true);
    expect(speciesRegistry.get('testcritter')).toEqual(def);
  });

  it('resolves a species by merging its family behaviour', () => {
    speciesRegistry.registerFamily(family);
    speciesRegistry.register(def);
    const resolved = speciesRegistry.resolve('testcritter');
    expect(resolved?.homeRadius).toBe(4); // from species
    expect(resolved?.behavior.restChance).toBe(0.3); // from family
    expect(resolved?.behavior.timers.idleMax).toBe(300);
  });

  it('does not resolve a species whose family is not registered', () => {
    speciesRegistry.register(def); // no family registered
    expect(speciesRegistry.resolve('testcritter')).toBeUndefined();
    expect(speciesRegistry.allResolved()).toEqual([]);
  });

  it('two species in one family share behaviour but keep own metadata', () => {
    speciesRegistry.registerFamily(family);
    speciesRegistry.register(def);
    speciesRegistry.register({
      ...def,
      species: 'othercritter',
      assetId: 'animal.othercritter',
      homeRadius: 9,
    });
    const a = speciesRegistry.resolve('testcritter');
    const b = speciesRegistry.resolve('othercritter');
    expect(a?.homeRadius).toBe(4);
    expect(b?.homeRadius).toBe(9);
    expect(a?.behavior).toEqual(b?.behavior); // same family behaviour
  });
});
