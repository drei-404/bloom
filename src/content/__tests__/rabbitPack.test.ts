import { describe, it, expect } from 'vitest';
import '../../wildlife/families/groundHerbivore'; // dependency: family behaviour
import { rabbitPack } from '../packs/rabbit.pack';
import { speciesRegistry } from '../../wildlife/species/SpeciesRegistry';
import { assetRegistry } from '../../assets/AssetRegistry';
import { animalRegistry } from '../../animal/AnimalRegistry';

describe('RabbitPack (reference content pack)', () => {
  it('registers species, asset and affinity from one pack', () => {
    rabbitPack.register();

    // Species (+ population) + resolvable behaviour.
    const resolved = speciesRegistry.resolve('rabbit');
    expect(resolved?.family).toBe('ground_herbivore');
    expect(resolved?.population).toEqual({ min: 1, max: 3 });
    expect(resolved?.behavior.restChance).toBe(0.3);

    // Asset.
    expect(assetRegistry.has('animal.rabbit')).toBe(true);
    expect(assetRegistry.byCategory('animal').map(a => a.id)).toContain('animal.rabbit');

    // Ecosystem affinity for native selection.
    expect(animalRegistry.get('rabbit')?.affinities).toEqual(['meadow']);
  });

  it('unregisters everything it added', () => {
    rabbitPack.register();
    rabbitPack.unregister();
    expect(speciesRegistry.has('rabbit')).toBe(false);
    expect(assetRegistry.has('animal.rabbit')).toBe(false);
    expect(animalRegistry.has('rabbit')).toBe(false);
  });

  it('declares pack identity + version', () => {
    expect(rabbitPack.id).toBe('bloom.species.rabbit');
    expect(rabbitPack.version).toBe('1.0.0');
  });
});
