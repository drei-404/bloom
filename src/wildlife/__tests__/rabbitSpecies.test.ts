import { describe, it, expect } from 'vitest';
// Static side-effect imports register the family then the species into the
// (per-file) singleton. No clear() here, so the registration stands.
import '../families/groundHerbivore';
import '../species/rabbit';
import { speciesRegistry } from '../species/SpeciesRegistry';

describe('rabbit as a registered species', () => {
  it('resolves through the framework with ground_herbivore behaviour', () => {
    const rabbit = speciesRegistry.resolve('rabbit');
    expect(rabbit).toBeDefined();
    expect(rabbit?.family).toBe('ground_herbivore');
    expect(rabbit?.movementType).toBe('walk');
    expect(rabbit?.assetId).toBe('animal.rabbit');
    expect(rabbit?.homeRadius).toBe(3);
    expect(rabbit?.population).toEqual({ min: 1, max: 3 });
    expect(rabbit?.affinities).toEqual(['meadow']);
    // Behaviour comes from the family, not the species.
    expect(rabbit?.behavior.restChance).toBe(0.3);
    expect(rabbit?.behavior.states).toEqual(['idle', 'walking', 'sleeping']);
    expect(rabbit?.behavior.timers.idleMin).toBe(120);
  });
});
