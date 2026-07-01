import { describe, it, expect } from 'vitest';
import type { AnimalState } from '../../animal/IAnimal';
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

describe('RabbitPack sprite assets (production art)', () => {
  it('registers a spritesheet with all seven frames', () => {
    rabbitPack.register();
    const a = assetRegistry.get('animal.rabbit');
    expect(a?.spritesheet).toBe('/assets/rabbit.png');
    expect(a?.staticFrame).toBe('idle_0');
    const frameIds = Object.keys(a?.frames ?? {});
    expect(frameIds.sort()).toEqual(
      ['idle_0', 'idle_1', 'sleep_0', 'walk_0', 'walk_1', 'walk_2', 'walk_3'].sort(),
    );
    // Every frame is a numeric pixel rect.
    for (const rect of Object.values(a?.frames ?? {})) {
      expect(rect).toMatchObject({
        x: expect.any(Number),
        y: expect.any(Number),
        w: expect.any(Number),
        h: expect.any(Number),
      });
    }
    rabbitPack.unregister();
  });

  it('defines idle / walking / sleeping clips keyed by AnimalState', () => {
    rabbitPack.register();
    const a = assetRegistry.get('animal.rabbit');
    const clips = a?.animations ?? {};
    // Clip ids are exactly the AnimalState values the rabbit FSM emits.
    const states: AnimalState[] = ['idle', 'walking', 'sleeping'];
    expect(Object.keys(clips).sort()).toEqual([...states].sort());

    expect(clips.walking).toMatchObject({
      frames: ['walk_0', 'walk_1', 'walk_2', 'walk_3'],
      loop: true,
    });
    expect(clips.walking.frameDurationMs).toBeGreaterThan(0);
    expect(clips.idle).toMatchObject({ frames: ['idle_0', 'idle_1'], loop: true });
    expect(clips.sleeping.frames).toEqual(['sleep_0']); // single held frame

    // Every clip frame id must exist in the sheet's frame table.
    const frameIds = new Set(Object.keys(a?.frames ?? {}));
    for (const clip of Object.values(clips)) {
      for (const f of clip.frames) expect(frameIds.has(f)).toBe(true);
    }
    rabbitPack.unregister();
  });

  it('keeps the placeholder palette for the sprite-load fallback', () => {
    rabbitPack.register();
    const a = assetRegistry.get('animal.rabbit');
    expect(a?.metadata).toMatchObject({ body: expect.any(Number), dark: expect.any(Number) });
    rabbitPack.unregister();
  });
});
