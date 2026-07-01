import { describe, it, expect, beforeEach } from 'vitest';
import { assetRegistry } from '../AssetRegistry';
import type { AssetDescriptor, AssetPack } from '../AssetDescriptor';
import { PLACEHOLDER_ASSET_PACK, ASSET_IDS } from '../placeholderPack';

const sample: AssetDescriptor = {
  id: 'animal.testcritter',
  category: 'animal',
  metadata: { body: 0x112233 },
};

describe('AssetRegistry ids', () => {
  it('accepts dotted lowercase ids and rejects malformed ones', () => {
    for (const ok of ['animal.rabbit', 'vegetation.flower.white', 'a', 'a_b.c_d', 'ui.button2']) {
      expect(assetRegistry.isValidId(ok)).toBe(true);
    }
    for (const bad of ['Animal.Rabbit', '.a', 'a.', 'a..b', 'a b', 'a-b', '']) {
      expect(assetRegistry.isValidId(bad)).toBe(false);
    }
  });

  it('throws when registering an invalid id', () => {
    expect(() => assetRegistry.register({ id: 'Bad Id', category: 'ui' })).toThrow();
  });
});

describe('AssetRegistry register / lookup / unregister', () => {
  beforeEach(() => assetRegistry.clear());

  it('registers, looks up, and reports presence', () => {
    assetRegistry.register(sample);
    expect(assetRegistry.has('animal.testcritter')).toBe(true);
    expect(assetRegistry.get('animal.testcritter')).toEqual(sample);
    expect(assetRegistry.getTexture('animal.testcritter')).toBeNull(); // placeholder
  });

  it('overrides an existing id (skins/marketplace replace defaults)', () => {
    assetRegistry.register(sample);
    const skin: AssetDescriptor = { ...sample, metadata: { body: 0x999999 } };
    assetRegistry.register(skin);
    expect(assetRegistry.get('animal.testcritter')?.metadata).toEqual({ body: 0x999999 });
  });

  it('unregisters', () => {
    assetRegistry.register(sample);
    assetRegistry.unregister('animal.testcritter');
    expect(assetRegistry.has('animal.testcritter')).toBe(false);
  });

  it('filters by category', () => {
    assetRegistry.register(sample);
    assetRegistry.register({ id: 'ui.panel', category: 'ui' });
    expect(assetRegistry.byCategory('animal').map(a => a.id)).toEqual(['animal.testcritter']);
    expect(assetRegistry.byCategory('ui').map(a => a.id)).toEqual(['ui.panel']);
    expect(assetRegistry.byCategory('weather')).toEqual([]);
  });

  it('requireMetadata returns typed data and throws when absent', () => {
    assetRegistry.register(sample);
    expect(assetRegistry.requireMetadata<{ body: number }>('animal.testcritter').body).toBe(0x112233);
    assetRegistry.register({ id: 'ui.bare', category: 'ui' });
    expect(() => assetRegistry.requireMetadata('ui.bare')).toThrow();
    expect(() => assetRegistry.requireMetadata('does.not.exist')).toThrow();
  });
});

describe('AssetRegistry animations', () => {
  beforeEach(() => assetRegistry.clear());

  const animated: AssetDescriptor = {
    id: 'animal.testcritter',
    category: 'animal',
    animations: {
      idle: { frames: ['idle_0', 'idle_1'], frameDurationMs: 200, loop: true },
      walking: { frames: ['walk_0', 'walk_1', 'walk_2'], frameDurationMs: 100, loop: true },
    },
  };

  it('looks up animation clips by id', () => {
    assetRegistry.register(animated);
    expect(assetRegistry.hasAnimation('animal.testcritter', 'idle')).toBe(true);
    expect(assetRegistry.getAnimation('animal.testcritter', 'walking')?.frames).toEqual([
      'walk_0',
      'walk_1',
      'walk_2',
    ]);
  });

  it('returns null for missing animations or assets', () => {
    assetRegistry.register(animated);
    expect(assetRegistry.getAnimation('animal.testcritter', 'flying')).toBeNull();
    expect(assetRegistry.hasAnimation('animal.testcritter', 'flying')).toBe(false);
    expect(assetRegistry.getAnimation('nope.asset', 'idle')).toBeNull();
  });

  it('lets a replacement asset override animations (marketplace skins)', () => {
    assetRegistry.register(animated);
    assetRegistry.register({
      ...animated,
      animations: { idle: { frames: ['fancy_0'], frameDurationMs: 500, loop: false } },
    });
    expect(assetRegistry.getAnimation('animal.testcritter', 'idle')?.frames).toEqual(['fancy_0']);
    expect(assetRegistry.hasAnimation('animal.testcritter', 'walking')).toBe(false); // replaced
  });

  it('has no frame textures until an atlas is loaded', () => {
    assetRegistry.register(animated);
    expect(assetRegistry.getFrameTexture('animal.testcritter', 'idle_0')).toBeNull();
  });

  it('getVariantTexture falls back to the static texture, then null', () => {
    // Variant frame + static both unloaded → null (renderer draws primitive).
    assetRegistry.register({
      id: 'vegetation.tree.oak',
      category: 'vegetation',
      spritesheet: 'x.png',
      frames: { sapling: { x: 0, y: 0, w: 32, h: 32 }, mature: { x: 64, y: 0, w: 32, h: 32 } },
      staticFrame: 'mature',
    });
    expect(assetRegistry.getVariantTexture('vegetation.tree.oak', 'sapling')).toBeNull();
    expect(assetRegistry.getVariantTexture('vegetation.tree.oak')).toBeNull();
    expect(assetRegistry.getVariantTexture('missing.asset', 'small')).toBeNull();
  });

  it('static assets (no animations) resolve to null clips — render-as-today fallback', () => {
    assetRegistry.register({ id: 'decoration.rock', category: 'decoration', metadata: {} });
    expect(assetRegistry.getAnimation('decoration.rock', 'idle')).toBeNull();
  });
});

describe('AssetRegistry sprite pipeline', () => {
  beforeEach(() => assetRegistry.clear());

  it('getStaticTexture is null for placeholders (→ primitive fallback)', () => {
    assetRegistry.register({ id: 'decoration.rock', category: 'decoration', metadata: {} });
    expect(assetRegistry.getStaticTexture('decoration.rock')).toBeNull();
    expect(assetRegistry.getStaticTexture('missing.asset')).toBeNull();
  });

  it('accepts spritesheet-image + frame metadata descriptors', () => {
    const sheet: AssetDescriptor = {
      id: 'decoration.fountain',
      category: 'decoration',
      spritesheet: 'packs/nature/fountain.png',
      frames: {
        f0: { x: 0, y: 0, w: 16, h: 16 },
        f1: { x: 16, y: 0, w: 16, h: 16 },
      },
      staticFrame: 'f0',
    };
    assetRegistry.register(sheet);
    expect(assetRegistry.get('decoration.fountain')?.spritesheet).toBe('packs/nature/fountain.png');
    // Nothing loaded yet → both frame + static resolve to null (renderer falls back).
    expect(assetRegistry.getFrameTexture('decoration.fountain', 'f0')).toBeNull();
    expect(assetRegistry.getStaticTexture('decoration.fountain')).toBeNull();
  });

  it('loadPack registers a pack (placeholder art loads nothing, never throws)', async () => {
    await expect(assetRegistry.loadPack(PLACEHOLDER_ASSET_PACK)).resolves.toBeUndefined();
    expect(assetRegistry.registeredPacks()).toContain(PLACEHOLDER_ASSET_PACK.id);
    expect(assetRegistry.getStaticTexture(ASSET_IDS.animal('rabbit'))).toBeNull();
  });

  it('unregister clears frame textures for the asset id', () => {
    assetRegistry.register({
      id: 'ui.spinner',
      category: 'ui',
      spritesheet: 'packs/ui/spinner.png',
      frames: { a: { x: 0, y: 0, w: 8, h: 8 } },
    });
    assetRegistry.unregister('ui.spinner');
    expect(assetRegistry.has('ui.spinner')).toBe(false);
    expect(assetRegistry.getFrameTexture('ui.spinner', 'a')).toBeNull();
  });
});

describe('AssetRegistry packs', () => {
  beforeEach(() => assetRegistry.clear());

  it('registers a pack and tracks it', () => {
    const pack: AssetPack = {
      id: 'test.pack',
      assets: [sample, { id: 'terrain.snow', category: 'terrain' }],
    };
    assetRegistry.registerPack(pack);
    expect(assetRegistry.registeredPacks()).toContain('test.pack');
    expect(assetRegistry.has('animal.testcritter')).toBe(true);
    expect(assetRegistry.has('terrain.snow')).toBe(true);
  });

  it('unregisterPack is symmetric — removes every asset and the pack id', () => {
    const pack: AssetPack = {
      id: 'test.pack',
      assets: [sample, { id: 'terrain.snow', category: 'terrain' }],
    };
    assetRegistry.registerPack(pack);
    assetRegistry.unregisterPack(pack);
    expect(assetRegistry.has('animal.testcritter')).toBe(false);
    expect(assetRegistry.has('terrain.snow')).toBe(false);
    expect(assetRegistry.registeredPacks()).not.toContain('test.pack'); // no pack-id leak
  });

  it('preloading a placeholder-only pack loads no textures', async () => {
    await assetRegistry.preloadPack(PLACEHOLDER_ASSET_PACK);
    // No asset in the placeholder pack references art, so nothing is cached.
    assetRegistry.registerPack(PLACEHOLDER_ASSET_PACK);
    expect(assetRegistry.getTexture(ASSET_IDS.animal('rabbit'))).toBeNull();
  });
});

describe('AssetRegistry preloadAll (loads every registered art descriptor)', () => {
  beforeEach(() => assetRegistry.clear());

  it('resolves and caches nothing when no registered descriptor references art', async () => {
    assetRegistry.registerPack(PLACEHOLDER_ASSET_PACK);
    assetRegistry.register({ id: 'animal.rabbit', category: 'animal', metadata: { body: 1, dark: 2 } });
    await expect(assetRegistry.preloadAll()).resolves.toBeUndefined();
    expect(assetRegistry.getStaticTexture('animal.rabbit')).toBeNull(); // still placeholder
  });

  it('never throws on a broken/missing art source (→ primitive fallback)', async () => {
    assetRegistry.register({
      id: 'animal.ghost',
      category: 'animal',
      spritesheet: '/assets/does-not-exist.png',
      frames: { f0: { x: 0, y: 0, w: 8, h: 8 } },
      staticFrame: 'f0',
      metadata: { body: 1, dark: 2 },
    });
    await expect(assetRegistry.preloadAll()).resolves.toBeUndefined();
    // Failed load leaves no texture — renderer falls back to the placeholder.
    expect(assetRegistry.getStaticTexture('animal.ghost')).toBeNull();
    expect(assetRegistry.getFrameTexture('animal.ghost', 'f0')).toBeNull();
  });
});

describe('placeholder pack contents', () => {
  beforeEach(() => {
    assetRegistry.clear();
    assetRegistry.registerPack(PLACEHOLDER_ASSET_PACK);
  });

  it('registers every current visual with a valid id and metadata', () => {
    for (const asset of PLACEHOLDER_ASSET_PACK.assets) {
      expect(assetRegistry.isValidId(asset.id)).toBe(true);
      expect(asset.metadata).toBeDefined();
    }
  });

  it('covers the expected base categories (animals come from species packs)', () => {
    expect(assetRegistry.byCategory('terrain').length).toBeGreaterThan(0);
    expect(assetRegistry.byCategory('vegetation').length).toBeGreaterThan(0);
    expect(assetRegistry.byCategory('decoration').length).toBeGreaterThan(0);
  });

  it('exposes each flower colour through the registry', () => {
    for (const c of ['white', 'pink', 'yellow', 'blue']) {
      expect(assetRegistry.has(ASSET_IDS.flower(c))).toBe(true);
    }
  });

  it('ships world sprite art (Phase C) while keeping placeholder metadata', () => {
    // Trees + rocks: a variant frame per sim stage/size, static fallback, palette kept.
    const tree = assetRegistry.get(ASSET_IDS.treeOak);
    expect(tree?.spritesheet).toBe('/assets/tree.png');
    expect(Object.keys(tree?.frames ?? {}).sort()).toEqual(['mature', 'sapling', 'young']);
    expect(tree?.staticFrame).toBe('mature');
    expect(tree?.metadata).toBeDefined(); // primitive fallback retained

    const rock = assetRegistry.get(ASSET_IDS.rock);
    expect(rock?.spritesheet).toBe('/assets/rock.png');
    expect(Object.keys(rock?.frames ?? {}).sort()).toEqual(['large', 'medium', 'small']);
    expect(rock?.staticFrame).toBe('medium');

    // Flowers + decorations: single static images.
    for (const c of ['white', 'pink', 'yellow', 'blue']) {
      expect(assetRegistry.get(ASSET_IDS.flower(c))?.textureUrl).toBe(`/assets/flower_${c}.png`);
    }
    for (const d of ['lilypad', 'fern', 'bush', 'tall_grass']) {
      expect(assetRegistry.get(ASSET_IDS.decoration(d))?.textureUrl).toBe(`/assets/${d}.png`);
    }
  });

  it('keeps tiles + tufts primitive (no art), palette-only', () => {
    expect(assetRegistry.get(ASSET_IDS.tile)?.textureUrl).toBeUndefined();
    expect(assetRegistry.get(ASSET_IDS.tile)?.spritesheet).toBeUndefined();
    expect(assetRegistry.get(ASSET_IDS.tuft)?.textureUrl).toBeUndefined();
  });
});
