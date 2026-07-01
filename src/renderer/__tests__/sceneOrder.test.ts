import { describe, it, expect } from 'vitest';
import { sceneDepth, compareScene, facingFlipX } from '../sceneOrder';
import type { Facing } from '../../animal/IAnimal';

describe('sceneDepth', () => {
  it('is the col+row back-to-front metric (larger = nearer)', () => {
    expect(sceneDepth(0, 0)).toBe(0);
    expect(sceneDepth(2, 3)).toBe(5);
    expect(sceneDepth(4, 1)).toBeGreaterThan(sceneDepth(1, 1));
  });
});

describe('compareScene — shared tree/animal ordering', () => {
  it('sorts back-to-front so nearer objects draw last (on top)', () => {
    const items = [
      { id: 'front', tileX: 4, tileY: 4 },
      { id: 'back', tileX: 0, tileY: 0 },
      { id: 'mid', tileX: 1, tileY: 2 },
    ];
    expect([...items].sort(compareScene).map(i => i.id)).toEqual(['back', 'mid', 'front']);
  });

  it('a tree occludes an animal behind it and is occluded by one in front', () => {
    const tree = { kind: 'tree', tileX: 3, tileY: 3 };
    const behind = { kind: 'animal', tileX: 2, tileY: 3 }; // smaller depth → drawn before tree
    const inFront = { kind: 'animal', tileX: 4, tileY: 3 }; // larger depth → drawn after tree
    const order = [inFront, tree, behind].sort(compareScene).map(i => i.kind + ':' + (i.tileX + i.tileY));
    expect(order).toEqual(['animal:5', 'tree:6', 'animal:7']);
  });

  it('breaks depth ties by column', () => {
    const a = { id: 'a', tileX: 1, tileY: 3 };
    const b = { id: 'b', tileX: 3, tileY: 1 };
    expect([b, a].sort(compareScene).map(i => i.id)).toEqual(['a', 'b']);
  });
});

describe('facingFlipX — Part 1 directional rendering', () => {
  it('mirrors only west when using the base east art', () => {
    expect(facingFlipX('west', false)).toBe(true);
    expect(facingFlipX('east', false)).toBe(false);
    // North/south have no directional art today → fall back to east, unflipped.
    expect(facingFlipX('north', false)).toBe(false);
    expect(facingFlipX('south', false)).toBe(false);
  });

  it('never flips when the asset ships directional art (art already faces right way)', () => {
    for (const f of ['east', 'west', 'north', 'south'] as Facing[]) {
      expect(facingFlipX(f, true)).toBe(false);
    }
  });
});
