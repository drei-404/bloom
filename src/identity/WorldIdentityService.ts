import type { WorldIdentity } from '../types/identity';
import { PersistenceService } from '../persistence/PersistenceService';
import { createRng, type Rng } from '../core/SeededRandom';

const UUID_PATTERN = /^BLOOM-WLD-[0-9A-F]{8}$/;

/**
 * Domain service for the permanent world identity.
 *
 * Identity is generated once in Rust at first install (db init). This service
 * loads, validates, and exposes it, and produces seeded RNGs for future
 * procedural systems. It never talks to SQLite directly — all access goes
 * through PersistenceService (the only SQLite gateway).
 */
export class WorldIdentityService {
  /** Load the permanent identity. */
  static load(): Promise<WorldIdentity | null> {
    return PersistenceService.loadIdentity();
  }

  /** Structural validation of an identity record. */
  static validate(identity: WorldIdentity | null): identity is WorldIdentity {
    if (!identity) return false;
    if (!UUID_PATTERN.test(identity.worldUuid)) return false;
    if (!Number.isInteger(identity.worldSeed)) return false;
    if (identity.worldName.length === 0) return false;
    return true;
  }

  /**
   * Deterministic RNG seeded by this world. Pass a `salt` to obtain an
   * independent, reproducible stream per system (e.g. 'flowers', 'trees').
   */
  static rng(identity: WorldIdentity, salt?: string): Rng {
    const base = createRng(identity.worldSeed);
    return salt ? base.fork(salt) : base;
  }
}
