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
  tileGrass: 'terrain.tile.grass',
  tileDirt: 'terrain.tile.dirt',
  water: 'terrain.water',
  cliffLeft: 'terrain.cliff.left',
  cliffRight: 'terrain.cliff.right',
  shoreline: 'terrain.shoreline',
  corner: 'terrain.corner',
  tuft: 'vegetation.tuft',
  flower: (type: string): string => `vegetation.flower.${type}`,
  treeOak: 'vegetation.tree.oak',
  rock: 'decoration.rock',
  decoration: (type: string): string => `decoration.${type}`,
  animal: (species: string): string => `animal.${species}`,
} as const;

// ── Sprite art ──────────────────────────────────────────────────────
// Production pixel art authored by scripts/gen-world.mjs. Multi-variant objects
// (tree stage, rock size) ship a strip whose frame ids ARE the sim variant, so
// the renderer resolves the right frame generically. Every descriptor keeps its
// placeholder metadata as the load-failure fallback — a missing PNG degrades to
// the primitive, never a crash.
const FS = 32;
const strip = (ids: string[]): Record<string, { x: number; y: number; w: number; h: number }> =>
  Object.fromEntries(ids.map((id, i) => [id, { x: i * FS, y: 0, w: FS, h: FS }]));

// Iso terrain frames are non-square (a 40x20 diamond top; cliffs 20x20; corners
// 40x24), so they can't use the 32px `strip`. Frame ids ARE the variant strings
// the renderer computes (grass/dirt hash, water ripple frame, shoreline edge,
// corner vertex) — the AssetRegistry resolves them exactly like tree/rock strips.
const iso = (
  ids: string[],
  w = 40,
  h = 20,
): Record<string, { x: number; y: number; w: number; h: number }> =>
  Object.fromEntries(ids.map((id, i) => [id, { x: i * w, y: 0, w, h }]));

// ── The pack ────────────────────────────────────────────────────────

export const PLACEHOLDER_ASSET_PACK: AssetPack = {
  id: 'bloom.placeholder',
  assets: [
    {
      id: ASSET_IDS.tile,
      category: 'terrain',
      // Tiles stay primitive (iso diamonds + a continuous grass gradient). Palette
      // retuned to sit under the sprite art: warmer soil, softer natural greens.
      metadata: {
        dirt: 0xb5895a,
        grass: 0x63a63f,
        water: 0x59a3d8,
        wallL: 0x8a5e34,
        wallR: 0x5f3d1e,
      } satisfies TilePalette,
    },
    // ── Terrain sprite tops / water / cliffs / silhouette (Phase C+) ──
    // Iso diamond tops (40x20). The renderer picks a variant frame by a pure
    // (col,row) hash; a missing sheet or frame degrades to the primitive diamond
    // drawn from the `terrain.tile` palette above.
    {
      id: ASSET_IDS.tileGrass,
      category: 'terrain',
      spritesheet: '/assets/terrain_grass.png',
      frames: iso(['g0', 'g1', 'g2', 'g3', 'g4', 'g5']),
      staticFrame: 'g0',
      // The systemic fallback is the `terrain.tile` primitive diamond; this palette
      // documents the sheet's dominant tone (kept so every descriptor has metadata).
      metadata: { grass: 0x63a63f },
    },
    {
      id: ASSET_IDS.tileDirt,
      category: 'terrain',
      spritesheet: '/assets/terrain_dirt.png',
      frames: iso(['d0', 'd1', 'd2', 'd3']),
      staticFrame: 'd0',
      metadata: { dirt: 0xb5895a },
    },
    {
      // Animated pond: 4-frame ripple, phase-offset per tile by the renderer.
      id: ASSET_IDS.water,
      category: 'terrain',
      spritesheet: '/assets/water.png',
      frames: iso(['r0', 'r1', 'r2', 'r3']),
      staticFrame: 'r0',
      animations: {
        ripple: { frames: ['r0', 'r1', 'r2', 'r3'], frameDurationMs: 220, loop: true },
      },
      metadata: { water: 0x59a3d8 },
    },
    {
      // Foam overlay on the water edge facing land; one of 8 edge variants
      // chosen from land-adjacency. Semi-transparent, drawn over the water base.
      id: ASSET_IDS.shoreline,
      category: 'terrain',
      spritesheet: '/assets/shoreline.png',
      frames: iso(['e_ne', 'e_se', 'e_sw', 'e_nw', 'e_n', 'e_e', 'e_s', 'e_w']),
      staticFrame: 'e_ne',
      metadata: { foam: 0xcaeaf6 },
    },
    {
      // Cliff faces (20x20 parallelograms) for the left (col=0) and right
      // (row=N-1) island edges; fall back to the flat trapezoid fills.
      id: ASSET_IDS.cliffLeft,
      category: 'terrain',
      spritesheet: '/assets/cliff_left.png',
      frames: iso(['wall'], 20, 20),
      staticFrame: 'wall',
      metadata: { wall: 0x8a5e34 },
    },
    {
      id: ASSET_IDS.cliffRight,
      category: 'terrain',
      spritesheet: '/assets/cliff_right.png',
      frames: iso(['wall'], 20, 20),
      staticFrame: 'wall',
      metadata: { wall: 0x5f3d1e },
    },
    {
      // Soft rounded overlays for the 4 silhouette vertices (40x24); absent →
      // square silhouette (today's look).
      id: ASSET_IDS.corner,
      category: 'terrain',
      spritesheet: '/assets/corners.png',
      frames: iso(['n', 'e', 's', 'w'], 40, 24),
      staticFrame: 'n',
      metadata: { grass: 0x63a63f },
    },
    {
      id: ASSET_IDS.tuft,
      category: 'vegetation',
      metadata: { sparse: 0x77b84a, lush: 0x4f8a2f } satisfies TuftPalette,
    },
    {
      id: ASSET_IDS.flower('white'),
      category: 'vegetation',
      textureUrl: '/assets/flower_white.png',
      metadata: { petal: 0xffffff, center: 0xffd23f, stem: 0x2d6010 } satisfies FlowerPalette,
    },
    {
      id: ASSET_IDS.flower('pink'),
      category: 'vegetation',
      textureUrl: '/assets/flower_pink.png',
      metadata: { petal: 0xff8fb0, center: 0xffd23f, stem: 0x2d6010 } satisfies FlowerPalette,
    },
    {
      id: ASSET_IDS.flower('yellow'),
      category: 'vegetation',
      textureUrl: '/assets/flower_yellow.png',
      metadata: { petal: 0xffe45e, center: 0xffd23f, stem: 0x2d6010 } satisfies FlowerPalette,
    },
    {
      id: ASSET_IDS.flower('blue'),
      category: 'vegetation',
      textureUrl: '/assets/flower_blue.png',
      metadata: { petal: 0x6fa8ff, center: 0xffd23f, stem: 0x2d6010 } satisfies FlowerPalette,
    },
    {
      id: ASSET_IDS.treeOak,
      category: 'vegetation',
      // Pine strip: one frame per growth stage; the renderer picks by tree.stage.
      spritesheet: '/assets/tree.png',
      frames: strip(['sapling', 'young', 'mature']),
      staticFrame: 'mature',
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
      // Rock strip: one frame per size; the renderer picks by rock.type.
      spritesheet: '/assets/rock.png',
      frames: strip(['small', 'medium', 'large']),
      staticFrame: 'medium',
      metadata: {
        body: 0x8a8b8e,
        light: 0xb6b7ba,
        dims: { small: 4, medium: 7, large: 10 },
      } satisfies RockPalette,
    },
    {
      id: ASSET_IDS.decoration('lilypad'),
      category: 'decoration',
      textureUrl: '/assets/lilypad.png',
      metadata: { pad: 0x2e8b57, rim: 0x4fb477 } satisfies LilypadPalette,
    },
    {
      id: ASSET_IDS.decoration('fern'),
      category: 'decoration',
      textureUrl: '/assets/fern.png',
      metadata: { frond: 0x3e7c2e } satisfies FernPalette,
    },
    {
      id: ASSET_IDS.decoration('bush'),
      category: 'decoration',
      textureUrl: '/assets/bush.png',
      metadata: { body: 0x356b1f, light: 0x4e8c2e } satisfies BushPalette,
    },
    {
      id: ASSET_IDS.decoration('tall_grass'),
      category: 'decoration',
      textureUrl: '/assets/tall_grass.png',
      metadata: { blade: 0x5ba12f } satisfies TallGrassPalette,
    },
    // Animal assets (e.g. animal.rabbit) are provided by their Content Packs, not
    // this base pack — see content/packs/rabbit.pack.ts.
  ],
};
