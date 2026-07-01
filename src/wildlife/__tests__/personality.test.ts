import { describe, it, expect } from 'vitest';
import type { WorldIdentity } from '../../types/identity';
import { personalityService } from '../PersonalityService';

const identity: WorldIdentity = {
  worldUuid: 'BLOOM-WLD-0000BEEF',
  worldName: 'Test',
  worldSeed: 20260701,
  createdAt: 0,
  bloomVersion: '0.1.0',
};

describe('PersonalityService', () => {
  it('is deterministic and immutable for a given world + animal', () => {
    const a = personalityService.get(identity, 'rabbit-0');
    const b = personalityService.get(identity, 'rabbit-0');
    expect(a).toEqual(b);
    expect(a).toBe(b); // cached, same reference
  });

  it('produces traits in [0,1)', () => {
    const p = personalityService.get(identity, 'rabbit-1');
    for (const v of [p.curiosity, p.energy, p.bravery, p.wanderTendency]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('gives different animals different personalities', () => {
    const sets = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const p = personalityService.get(identity, `rabbit-${100 + i}`);
      sets.add(`${p.curiosity},${p.energy},${p.bravery},${p.wanderTendency}`);
    }
    expect(sets.size).toBeGreaterThan(1);
  });
});
