import type { Texture } from 'pixi.js';
import type {
  AnimationClip,
  AssetCategory,
  AssetDescriptor,
  AssetPack,
} from './AssetDescriptor';

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
  /** Per-frame textures from loaded atlases, keyed `${assetId}#${frameId}`. */
  private readonly frameTextures = new Map<string, Texture>();
  private readonly packs = new Set<string>();

  private frameKey(assetId: string, frameId: string): string {
    return `${assetId}#${frameId}`;
  }

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

  /** Remove an asset and any cached textures (whole + per-frame). */
  unregister(id: string): void {
    this.descriptors.delete(id);
    this.textures.delete(id);
    const prefix = `${id}#`;
    for (const key of this.frameTextures.keys()) {
      if (key.startsWith(prefix)) this.frameTextures.delete(key);
    }
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

  /** Register a pack and load its art in one step (marketplace/seasonal packs). */
  async loadPack(pack: AssetPack): Promise<void> {
    this.registerPack(pack);
    await this.preloadPack(pack);
  }

  /** Ids of packs registered so far. */
  registeredPacks(): string[] {
    return [...this.packs];
  }

  private assetReferencesArt(a: AssetDescriptor): boolean {
    return Boolean(a.textureUrl || a.atlas || (a.spritesheet && a.frames));
  }

  /** Load textures for a single pack's art (marketplace/seasonal packs). */
  async preloadPack(pack: AssetPack): Promise<void> {
    await this.loadArt(pack.assets);
  }

  /**
   * Load textures for every registered descriptor that references art. Called
   * once at renderer startup so content-pack art (species spritesheets, etc.)
   * lights up without the renderer knowing which packs exist. Adding a species is
   * one spritesheet + one pack edit — this picks it up with no renderer changes.
   */
  async preloadAll(): Promise<void> {
    await this.loadArt(this.all());
  }

  /**
   * Load textures for the art-referencing assets in `assets`. Three sources, any
   * combination:
   *   • `textureUrl`            → whole-asset static texture
   *   • `spritesheet` + `frames`→ image sliced into per-frame textures by rect
   *   • `atlas`                 → external Pixi spritesheet descriptor (json+image)
   * Placeholder assets reference no art and are skipped. Every load is guarded so
   * a missing/broken file — or an unavailable rendering stack — degrades to the
   * primitive placeholder, never a crash. Pixi is imported lazily so non-rendering
   * contexts (tests, headless) never pull in the WebGL stack.
   */
  private async loadArt(assets: AssetDescriptor[]): Promise<void> {
    const withArt = assets.filter(a => this.assetReferencesArt(a));
    if (withArt.length === 0) return;

    let pixi: typeof import('pixi.js');
    try {
      pixi = await import('pixi.js');
    } catch {
      return; // no rendering stack (headless/test) → everything stays placeholder
    }
    const { Assets, Texture, Rectangle } = pixi;
    for (const asset of withArt) {
      try {
        if (asset.textureUrl) {
          this.textures.set(asset.id, (await Assets.load(asset.textureUrl)) as Texture);
        }
        if (asset.spritesheet && asset.frames) {
          // Slice a hand-authored sheet image into per-frame textures.
          const base = (await Assets.load(asset.spritesheet)) as Texture;
          for (const [frameId, rect] of Object.entries(asset.frames)) {
            const frameTexture = new Texture({
              source: base.source,
              frame: new Rectangle(rect.x, rect.y, rect.w, rect.h),
            });
            this.frameTextures.set(this.frameKey(asset.id, frameId), frameTexture);
          }
        }
        if (asset.atlas) {
          // An external spritesheet exposes its frames as a name → Texture map.
          const sheet = (await Assets.load(asset.atlas)) as { textures?: Record<string, Texture> };
          for (const [frameId, tex] of Object.entries(sheet?.textures ?? {})) {
            this.frameTextures.set(this.frameKey(asset.id, frameId), tex);
          }
        }
      } catch {
        // Leave unregistered — renderer falls back to the placeholder.
      }
    }
  }

  /** The loaded whole-asset texture, or null if it is a placeholder / unloaded. */
  getTexture(id: string): Texture | null {
    return this.textures.get(id) ?? null;
  }

  /**
   * The texture to draw for a non-animating asset: its whole-asset texture, or
   * its declared `staticFrame` from a loaded sheet, or null (→ placeholder).
   */
  getStaticTexture(id: string): Texture | null {
    const whole = this.textures.get(id);
    if (whole) return whole;
    const staticFrame = this.descriptors.get(id)?.staticFrame;
    if (staticFrame) return this.getFrameTexture(id, staticFrame);
    return null;
  }

  /** A specific atlas frame's texture, or null if not loaded. */
  getFrameTexture(assetId: string, frameId: string): Texture | null {
    return this.frameTextures.get(this.frameKey(assetId, frameId)) ?? null;
  }

  /** An asset's animation clip by id (e.g. the state `walking`), or null. */
  getAnimation(assetId: string, animationId: string): AnimationClip | null {
    return this.descriptors.get(assetId)?.animations?.[animationId] ?? null;
  }

  /** Whether an asset defines the given animation. */
  hasAnimation(assetId: string, animationId: string): boolean {
    return this.getAnimation(assetId, animationId) !== null;
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
    this.frameTextures.clear();
    this.packs.clear();
  }
}

export const assetRegistry = new AssetRegistry();
