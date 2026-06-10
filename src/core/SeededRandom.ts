/**
 * Deterministic pseudo-random generator (mulberry32).
 * Same seed always yields the same sequence — the basis for all future
 * procedural generation. Content systems must use this, never Math.random().
 */
export interface Rng {
  /** Next float in [0, 1). */
  next(): number;
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** Float in [min, max). */
  range(min: number, max: number): number;
  /** Pick one element from a non-empty array. */
  pick<T>(arr: readonly T[]): T;
  /** Derive an independent stream from this seed (e.g. one per system). */
  fork(salt: string): Rng;
}

function hashSalt(seed: number, salt: string): number {
  let h = seed >>> 0;
  for (let i = 0; i < salt.length; i++) {
    h = Math.imul(h ^ salt.charCodeAt(i), 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const rng: Rng = {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    range: (min, max) => min + next() * (max - min),
    pick: arr => arr[Math.floor(next() * arr.length)],
    fork: salt => createRng(hashSalt(seed, salt)),
  };

  return rng;
}
