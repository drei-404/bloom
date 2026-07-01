import type { WorldIdentity } from '../types/identity';
import type { Personality } from './types';
import { WorldIdentityService } from '../identity/WorldIdentityService';

/**
 * Assigns every animal an immutable personality, generated once and forever from
 * the world seed + the animal id. Same world + same animal → same traits, on any
 * machine, with no persistence and no Math.random(). Behaviour engines will read
 * these later; nothing consumes them yet, so they are visibly inert today.
 */
class PersonalityService {
  private readonly cache = new Map<string, Personality>();

  /** The animal's traits, deriving + caching them on first request. */
  get(identity: WorldIdentity, animalId: string): Personality {
    const cached = this.cache.get(animalId);
    if (cached) return cached;

    const rng = WorldIdentityService.rng(identity, `personality-${animalId}`);
    const personality: Personality = {
      curiosity: rng.next(),
      energy: rng.next(),
      bravery: rng.next(),
      wanderTendency: rng.next(),
    };
    this.cache.set(animalId, personality);
    return personality;
  }

  /** Drop cached traits for animals that no longer exist. */
  prune(liveIds: Set<string>): void {
    for (const id of this.cache.keys()) {
      if (!liveIds.has(id)) this.cache.delete(id);
    }
  }
}

export const personalityService = new PersonalityService();
