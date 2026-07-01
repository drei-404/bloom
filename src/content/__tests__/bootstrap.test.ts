import { describe, it, expect } from 'vitest';
import { loadBloomContent } from '../bootstrap';
import { contentRegistry } from '../ContentRegistry';
import { speciesRegistry } from '../../wildlife/species/SpeciesRegistry';

describe('content bootstrap', () => {
  it('loads all species packs through the pipeline', () => {
    loadBloomContent();
    expect(contentRegistry.isLoaded('bloom.species.rabbit')).toBe(true);
    expect(contentRegistry.isLoaded('bloom.species.deer')).toBe(true);
    expect(contentRegistry.isLoaded('bloom.species.butterfly')).toBe(true);
    expect(contentRegistry.isLoaded('bloom.species.hedgehog')).toBe(true);
    expect(contentRegistry.isLoaded('bloom.species.squirrel')).toBe(true);
    expect(contentRegistry.isLoaded('bloom.species.beaver')).toBe(true);
    // Species resolve (family behaviour registered too).
    expect(speciesRegistry.resolve('rabbit')).toBeDefined();
    expect(speciesRegistry.resolve('deer')).toBeDefined();
    expect(speciesRegistry.resolve('butterfly')).toBeDefined();
    expect(speciesRegistry.resolve('hedgehog')).toBeDefined();
    expect(speciesRegistry.resolve('squirrel')).toBeDefined();
    expect(speciesRegistry.resolve('beaver')).toBeDefined();
  });

  it('is idempotent', () => {
    loadBloomContent();
    loadBloomContent();
    expect(contentRegistry.loaded()).toContain('bloom.species.deer');
  });
});
