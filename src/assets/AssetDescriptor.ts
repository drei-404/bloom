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
 * A single obtainable asset. Today most assets are primitive placeholders (no
 * texture), described only by `metadata` the renderer reads to draw shapes. When
 * real art ships, the same descriptor gains an `atlas`/`textureUrl` and the
 * renderer draws a sprite instead — with no renderer code changes.
 */
export interface AssetDescriptor {
  /** Stable dotted id, e.g. `animal.rabbit`, `vegetation.flower.white`. */
  id: string;
  category: AssetCategory;
  /** Optional atlas (spritesheet) URL this asset's frames live in. */
  atlas?: string;
  /** Optional standalone texture URL (when not atlas-packed). */
  textureUrl?: string;
  /** Named frames within the atlas. */
  frames?: Record<string, AtlasFrame>;
  /** Named animations → ordered frame keys. */
  animations?: Record<string, string[]>;
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
