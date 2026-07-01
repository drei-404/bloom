import type { Texture } from 'pixi.js';
import type { AssetCategory, AssetDescriptor, AssetPack } from './AssetDescriptor';

const ID_PATTERN = /^[a-z0-9_]+(?:\.[a-z0-9_]+)*$/;

/**
 * The single source of truth for every visual asset in Bloom.
 *
 * Anything the renderer draws — animals, terrain, vegetation, decorations,
 * weather, UI, and future marketplace packs — is looked up here by id. The
 * renderer never knows filesystem paths, pack origins, or whether an asset is a
 * primitive placeholder or a loaded texture. New packs register through this
 * registry and light up in the renderer with zero renderer changes.
 *
 * Pure data + texture caching. No gameplay, no simulation, no persistence.
 */
class AssetRegistry {
  private readonly descriptors = new Map<string, AssetDescriptor>();
  private readonly textures = new Map<string, Texture>();
  private readonly packs = new Set<string>();

  /** Whether an id is structurally valid (dotted lowercase segments). */
  isValidId(id: string): boolean {
    return ID_PATTERN.test(id);
  }

  /**
   * Register (or override) a single asset. Overriding is intentional: a skin or
   * marketplace pack can replace a default asset under the same id.
   */
  register(descriptor: AssetDescriptor): void {
    if (!this.isValidId(descriptor.id)) {
      throw new Error(`invalid asset id: "${descriptor.id}"`);
    }
    this.descriptors.set(descriptor.id, descriptor);
  }

  /** Remove an asset and any cached texture. */
  unregister(id: string): void {
    this.descriptors.delete(id);
    this.textures.delete(id);
  }

  get(id: string): AssetDescriptor | undefined {
    return this.descriptors.get(id);
  }

  has(id: string): boolean {
    return this.descriptors.has(id);
  }

  all(): AssetDescriptor[] {
    return [...this.descriptors.values()];
  }

  byCategory(category: AssetCategory): AssetDescriptor[] {
    return this.all().filter(d => d.category === category);
  }

  /** Register every asset in a pack. */
  registerPack(pack: AssetPack): void {
    for (const asset of pack.assets) this.register(asset);
    this.packs.add(pack.id);
  }

  /** Ids of packs registered so far. */
  registeredPacks(): string[] {
    return [...this.packs];
  }

  /**
   * Load textures for a pack's assets that reference real art (atlas/textureUrl).
   * Placeholder assets have neither and are skipped. Failures are non-fatal so a
   * missing file degrades to the primitive placeholder rather than crashing.
   * Pixi is imported lazily so non-rendering contexts (tests, headless) never pull
   * in the WebGL stack.
   */
  async preloadPack(pack: AssetPack): Promise<void> {
    const withArt = pack.assets.filter(a => a.textureUrl || a.atlas);
    if (withArt.length === 0) return;

    const { Assets } = await import('pixi.js');
    for (const asset of withArt) {
      const url = asset.textureUrl ?? asset.atlas!;
      try {
        const texture = (await Assets.load(url)) as Texture;
        this.textures.set(asset.id, texture);
      } catch {
        // Leave unregistered — renderer falls back to the placeholder.
      }
    }
  }

  /** The loaded texture for an asset, or null if it is a placeholder / unloaded. */
  getTexture(id: string): Texture | null {
    return this.textures.get(id) ?? null;
  }

  /** Typed metadata accessor. Throws if the asset or its metadata is missing. */
  requireMetadata<T>(id: string): T {
    const descriptor = this.descriptors.get(id);
    if (!descriptor?.metadata) {
      throw new Error(`asset "${id}" has no metadata registered`);
    }
    return descriptor.metadata as T;
  }

  /** Test/reset hook. */
  clear(): void {
    this.descriptors.clear();
    this.textures.clear();
    this.packs.clear();
  }
}

export const assetRegistry = new AssetRegistry();
