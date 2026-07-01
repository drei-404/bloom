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

  it('preloading a placeholder-only pack loads no textures', async () => {
    await assetRegistry.preloadPack(PLACEHOLDER_ASSET_PACK);
    // No asset in the placeholder pack references art, so nothing is cached.
    assetRegistry.registerPack(PLACEHOLDER_ASSET_PACK);
    expect(assetRegistry.getTexture(ASSET_IDS.animal('rabbit'))).toBeNull();
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

  it('covers the expected categories', () => {
    expect(assetRegistry.byCategory('animal').length).toBeGreaterThan(0);
    expect(assetRegistry.byCategory('terrain').length).toBeGreaterThan(0);
    expect(assetRegistry.byCategory('vegetation').length).toBeGreaterThan(0);
    expect(assetRegistry.byCategory('decoration').length).toBeGreaterThan(0);
  });

  it('exposes rabbit + each flower colour through the registry', () => {
    expect(assetRegistry.has(ASSET_IDS.animal('rabbit'))).toBe(true);
    for (const c of ['white', 'pink', 'yellow', 'blue']) {
      expect(assetRegistry.has(ASSET_IDS.flower(c))).toBe(true);
    }
  });
});
