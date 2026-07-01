import { describe, it, expect } from 'vitest';
import { createRng } from '../SeededRandom';

describe('SeededRandom determinism', () => {
  it('same seed → identical stream', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 50; i++) expect(a.next()).toBe(b.next());
  });

  it('fork is stable and independent of draw history', () => {
    const base = createRng(7);
    const f1 = base.fork('trees').next();
    base.next(); // advancing the parent must not change a fresh fork
    const f2 = createRng(7).fork('trees').next();
    expect(f1).toBe(f2);
  });
});

describe('SeededRandom.shuffle', () => {
  const arr = Array.from({ length: 25 }, (_, i) => i);

  it('is byte-identical to the map/key/sort idiom it replaced', () => {
    const viaShuffle = createRng(99).shuffle(arr);
    const rng = createRng(99);
    const viaIdiom = arr
      .map(value => ({ value, key: rng.next() }))
      .sort((a, b) => a.key - b.key)
      .map(e => e.value);
    expect(viaShuffle).toEqual(viaIdiom);
  });

  it('consumes exactly one draw per element (draw order preserved)', () => {
    // After shuffling N elements, both streams must be at the same position.
    const a = createRng(5);
    const b = createRng(5);
    a.shuffle(arr);
    for (let i = 0; i < arr.length; i++) b.next();
    expect(a.next()).toBe(b.next());
  });

  it('same seed → same order; does not mutate input', () => {
    const copy = [...arr];
    const first = createRng(3).shuffle(arr);
    const second = createRng(3).shuffle(arr);
    expect(first).toEqual(second);
    expect(arr).toEqual(copy); // input untouched
    expect([...first].sort((x, y) => x - y)).toEqual(copy); // a permutation
  });
});
