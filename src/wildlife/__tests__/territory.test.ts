import { describe, it, expect } from 'vitest';
import { createRng } from '../../core/SeededRandom';
import { movementSystem } from '../MovementSystem';

interface Cand {
  x: number;
  y: number;
  facing: 'north' | 'east' | 'south' | 'west';
}

const home = { x: 5, y: 5 };
const radius = 3;

function neighbors(x: number, y: number): Cand[] {
  return [
    { x: x + 1, y, facing: 'east' },
    { x: x - 1, y, facing: 'west' },
    { x, y: y + 1, facing: 'south' },
    { x, y: y - 1, facing: 'north' },
  ];
}

const within = (c: Cand): boolean =>
  Math.abs(c.x - home.x) <= radius && Math.abs(c.y - home.y) <= radius;

describe('chooseHomewardStep (territory bias)', () => {
  it('never steps outside the territory while an inside option exists', () => {
    // At the edge (8,5): radius 3 → x in [2,8]. Neighbor (9,5) is outside.
    const cands = neighbors(8, 5);
    const rng = createRng(123);
    for (let i = 0; i < 200; i++) {
      const pick = movementSystem.chooseHomewardStep(cands, home, radius, rng);
      expect(within(pick)).toBe(true); // (9,5) never chosen
    }
  });

  it('drifts back toward home when already outside the territory', () => {
    // Marooned at (9,9), all four neighbors are outside radius (Chebyshev 4–5).
    // Bias picks the Chebyshev-closest (4): (8,9) or (9,8) — both step homeward.
    const cands = neighbors(9, 9);
    const rng = createRng(7);
    const manhattan = (c: Cand): number => Math.abs(c.x - home.x) + Math.abs(c.y - home.y);
    const homeManhattanFromHere = manhattan({ x: 9, y: 9, facing: 'east' }); // 8
    for (let i = 0; i < 50; i++) {
      const pick = movementSystem.chooseHomewardStep(cands, home, radius, rng);
      // Only (8,9) and (9,8) qualify — each reduces distance to home.
      expect([`8,9`, `9,8`]).toContain(`${pick.x},${pick.y}`);
      expect(manhattan(pick)).toBeLessThan(homeManhattanFromHere);
    }
  });

  it('is deterministic for a given seed', () => {
    const cands = neighbors(5, 5);
    const a = movementSystem.chooseHomewardStep(cands, home, radius, createRng(42));
    const b = movementSystem.chooseHomewardStep(cands, home, radius, createRng(42));
    expect(a).toEqual(b);
  });
});
