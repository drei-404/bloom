import type { AssetPack } from './AssetDescriptor';
import type { TreeStage } from '../types/tree';
import type { RockType } from '../types/rock';

/**
 * The built-in placeholder asset pack: primitive-drawing palettes and dimensions
 * for every visual Bloom renders today. No textures — each descriptor's metadata
 * is what the renderer reads to draw shapes. Ship real art later by giving these
 * ids an atlas/texture (or overriding them from a marketplace pack); the renderer
 * needs no changes.
 *
 * The exact colour/size values are the pre-registry constants, so visuals are
 * unchanged.
 */

// ── Palette metadata shapes (consumed by the renderer) ──────────────

export interface TilePalette {
  dirt: number;
  grass: number;
  water: number;
  wallL: number;
  wallR: number;
}
export interface TuftPalette {
  sparse: number;
  lush: number;
}
export interface FlowerPalette {
  petal: number;
  center: number;
  stem: number;
}
export interface TreeStageDims {
  trunkW: number;
  trunkH: number;
  canopyR: number;
}
export interface TreePalette {
  trunk: number;
  canopy: number;
  canopyLight: number;
  dims: Record<TreeStage, TreeStageDims>;
}
export interface RockPalette {
  body: number;
  light: number;
  dims: Record<RockType, number>;
}
export interface LilypadPalette {
  pad: number;
  rim: number;
}
export interface FernPalette {
  frond: number;
}
export interface BushPalette {
  body: number;
  light: number;
}
export interface TallGrassPalette {
  blade: number;
}
export interface AnimalPalette {
  body: number;
  dark: number;
}

// ── Stable asset ids ────────────────────────────────────────────────

export const ASSET_IDS = {
  tile: 'terrain.tile',
  tuft: 'vegetation.tuft',
  flower: (type: string): string => `vegetation.flower.${type}`,
  treeOak: 'vegetation.tree.oak',
  rock: 'decoration.rock',
  decoration: (type: string): string => `decoration.${type}`,
  animal: (species: string): string => `animal.${species}`,
} as const;

// ── The pack ────────────────────────────────────────────────────────

export const PLACEHOLDER_ASSET_PACK: AssetPack = {
  id: 'bloom.placeholder',
  assets: [
    {
      id: ASSET_IDS.tile,
      category: 'terrain',
      metadata: {
        dirt: 0x9b6b3a,
        grass: 0x3d7a1a,
        water: 0x3a7bd5,
        wallL: 0x7a4e2a,
        wallR: 0x5c3419,
      } satisfies TilePalette,
    },
    {
      id: ASSET_IDS.tuft,
      category: 'vegetation',
      metadata: { sparse: 0x4a8a22, lush: 0x2d6010 } satisfies TuftPalette,
    },
    {
      id: ASSET_IDS.flower('white'),
      category: 'vegetation',
      metadata: { petal: 0xffffff, center: 0xffd23f, stem: 0x2d6010 } satisfies FlowerPalette,
    },
    {
      id: ASSET_IDS.flower('pink'),
      category: 'vegetation',
      metadata: { petal: 0xff8fb0, center: 0xffd23f, stem: 0x2d6010 } satisfies FlowerPalette,
    },
    {
      id: ASSET_IDS.flower('yellow'),
      category: 'vegetation',
      metadata: { petal: 0xffe45e, center: 0xffd23f, stem: 0x2d6010 } satisfies FlowerPalette,
    },
    {
      id: ASSET_IDS.flower('blue'),
      category: 'vegetation',
      metadata: { petal: 0x6fa8ff, center: 0xffd23f, stem: 0x2d6010 } satisfies FlowerPalette,
    },
    {
      id: ASSET_IDS.treeOak,
      category: 'vegetation',
      metadata: {
        trunk: 0x6b4a2a,
        canopy: 0x2e6b1e,
        canopyLight: 0x3f8a2a,
        dims: {
          sapling: { trunkW: 2, trunkH: 5, canopyR: 4 },
          young: { trunkW: 3, trunkH: 9, canopyR: 7 },
          mature: { trunkW: 4, trunkH: 14, canopyR: 11 },
        },
      } satisfies TreePalette,
    },
    {
      id: ASSET_IDS.rock,
      category: 'decoration',
      metadata: {
        body: 0x8a8b8e,
        light: 0xb6b7ba,
        dims: { small: 4, medium: 7, large: 10 },
      } satisfies RockPalette,
    },
    {
      id: ASSET_IDS.decoration('lilypad'),
      category: 'decoration',
      metadata: { pad: 0x2e8b57, rim: 0x4fb477 } satisfies LilypadPalette,
    },
    {
      id: ASSET_IDS.decoration('fern'),
      category: 'decoration',
      metadata: { frond: 0x3e7c2e } satisfies FernPalette,
    },
    {
      id: ASSET_IDS.decoration('bush'),
      category: 'decoration',
      metadata: { body: 0x356b1f, light: 0x4e8c2e } satisfies BushPalette,
    },
    {
      id: ASSET_IDS.decoration('tall_grass'),
      category: 'decoration',
      metadata: { blade: 0x5ba12f } satisfies TallGrassPalette,
    },
    // Animal assets (e.g. animal.rabbit) are provided by their Content Packs, not
    // this base pack — see content/packs/rabbit.pack.ts.
  ],
};
