import type { AnimationClip, AtlasFrame } from './AssetDescriptor';

/**
 * The standard animal sprite layout, shared by every species content pack.
 *
 * Each animal ships one spritesheet at `/assets/<species>.png`: a horizontal
 * strip of 32x32 frames in a fixed order, authored by scripts/gen-sheets.mjs.
 * The clip ids are the `AnimalState` values the wildlife FSM emits
 * (idle/walking/sleeping), so the generic renderer resolves them with no
 * species-specific code. A species pack spreads {@link animalSprite} into its
 * asset descriptor and keeps its placeholder palette as the load-failure
 * fallback — exactly like the rabbit reference pack.
 *
 * MUST stay in sync with FRAME_ORDER in scripts/lib/pixel.mjs.
 */
export const ANIMAL_FRAME_SIZE = 32;

export const ANIMAL_FRAME_ORDER = [
  'idle_0',
  'idle_1',
  'walk_0',
  'walk_1',
  'walk_2',
  'walk_3',
  'sleep_0',
] as const;

/** Slice the strip into `frameId → pixel rect` by column index. */
export function animalFrames(): Record<string, AtlasFrame> {
  return Object.fromEntries(
    ANIMAL_FRAME_ORDER.map((id, i) => [
      id,
      { x: i * ANIMAL_FRAME_SIZE, y: 0, w: ANIMAL_FRAME_SIZE, h: ANIMAL_FRAME_SIZE },
    ]),
  );
}

/** Animation clips keyed by the state that plays them. */
export const ANIMAL_ANIMATIONS: Record<string, AnimationClip> = {
  idle: { frames: ['idle_0', 'idle_1'], frameDurationMs: 500, loop: true },
  walking: { frames: ['walk_0', 'walk_1', 'walk_2', 'walk_3'], frameDurationMs: 120, loop: true },
  sleeping: { frames: ['sleep_0'], frameDurationMs: 0, loop: false }, // single held frame
};

export interface AnimalSprite {
  spritesheet: string;
  frames: Record<string, AtlasFrame>;
  staticFrame: string;
  animations: Record<string, AnimationClip>;
}

/**
 * The standard sprite fields for a species whose sheet lives at `spritesheet`.
 * Spread into an animal AssetDescriptor alongside its `metadata` palette.
 *
 * `animations` defaults to the shared clips. A species may pass a tuned set
 * (e.g. a faster flap or a slower, heavier walk) — metadata only, no new
 * animation system. Build one by spreading {@link ANIMAL_ANIMATIONS} and
 * overriding the clips that differ.
 */
export function animalSprite(
  spritesheet: string,
  animations: Record<string, AnimationClip> = ANIMAL_ANIMATIONS,
): AnimalSprite {
  return {
    spritesheet,
    frames: animalFrames(),
    staticFrame: 'idle_0',
    animations,
  };
}
