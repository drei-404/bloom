/**
 * Asset framework types. These describe *where a visual comes from* and *how it
 * is packaged* — never gameplay. The renderer consumes descriptors purely as
 * data; simulation and persistence never touch them.
 */

/** Broad classification. Metadata only — the renderer never branches on it. */
export type AssetCategory =
  | 'animal'
  | 'terrain'
  | 'vegetation'
  | 'decoration'
  | 'weather'
  | 'ui'
  | 'marketplace';

/** A named region of a sprite atlas (pixels). */
export interface AtlasFrame {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * A single animation clip: an ordered list of frame ids played at a fixed rate.
 * The clip id is chosen to match the state that drives it (e.g. the simulation
 * state `walking`, or a decoration/weather state) so the renderer resolves it
 * with `asset.animation(state)` and never needs to know what it is animating.
 */
export interface AnimationClip {
  /** Ordered frame ids (keys into this asset's atlas frames). */
  frames: string[];
  /** How long each frame is shown, in milliseconds. */
  frameDurationMs: number;
  /** Loop back to the first frame after the last (else hold the last frame). */
  loop: boolean;
}

/**
 * A single obtainable asset. Today most assets are primitive placeholders (no
 * texture), described only by `metadata` the renderer reads to draw shapes. When
 * real art ships, the same descriptor gains an `atlas`/`textureUrl` and the
 * renderer draws a sprite instead — with no renderer code changes.
 */
export interface AssetDescriptor {
  /** Stable dotted id, e.g. `animal.rabbit`, `vegetation.flower.white`. */
  id: string;
  category: AssetCategory;
  /**
   * URL of an external spritesheet descriptor (e.g. TexturePacker / Pixi JSON)
   * that bundles its own image + frames. Loaded as a Pixi spritesheet.
   */
  atlas?: string;
  /**
   * URL of a spritesheet image whose frames are described by `frames` below.
   * The loader slices it into per-frame textures. Use this + `frames` for
   * hand-authored atlases without an external descriptor file.
   */
  spritesheet?: string;
  /** URL of a standalone image used as the whole-asset static texture. */
  textureUrl?: string;
  /** Atlas metadata: frame id → pixel rectangle within `spritesheet`. */
  frames?: Record<string, AtlasFrame>;
  /** Frame id drawn when the asset is not animating (static sprite from a sheet). */
  staticFrame?: string;
  /** Named animation clips, keyed by the state that plays them (idle, walking, …). */
  animations?: Record<string, AnimationClip>;
  /** Free-form data (placeholder palettes/dimensions, art hints, etc.). */
  metadata?: Record<string, unknown>;
}

/**
 * A group of assets shipped together — the built-in placeholder set today, and
 * downloadable/marketplace packs in future. Packs register through AssetRegistry
 * without the renderer knowing they exist.
 */
export interface AssetPack {
  id: string;
  assets: AssetDescriptor[];
}
