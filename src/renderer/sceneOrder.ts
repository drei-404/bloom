import type { Facing } from '../animal/IAnimal';

/**
 * Pure depth + facing helpers for the renderer's shared tree/animal scene pass.
 * Kept free of Pixi so they can be unit-tested without a WebGL context.
 */

/**
 * Back-to-front sort key for a tile position. Larger = nearer the camera (drawn
 * later, on top). This is the same `col + row` metric every layer sorts by, so
 * trees and animals interleave consistently: an animal north of a tree (smaller
 * key) draws behind it; one to the south (larger key) draws in front.
 */
export function sceneDepth(tileX: number, tileY: number): number {
  return tileX + tileY;
}

/** Compare two scene items back-to-front; ties broken by column (tileX). */
export function compareScene(
  a: { tileX: number; tileY: number },
  b: { tileX: number; tileY: number },
): number {
  return sceneDepth(a.tileX, a.tileY) - sceneDepth(b.tileX, b.tileY) || a.tileX - b.tileX;
}

/**
 * Whether the east-facing base art should be mirrored horizontally.
 *
 * East is the authored default, west mirrors it. North/south use a directional
 * clip when the asset ships one (`hasDirectionalArt`) and are never flipped;
 * with no such art they fall back to the east sprite unflipped — graceful, and
 * the simulation's facing is untouched.
 */
export function facingFlipX(facing: Facing, hasDirectionalArt: boolean): boolean {
  return facing === 'west' && !hasDirectionalArt;
}
