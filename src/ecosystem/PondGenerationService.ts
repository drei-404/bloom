import type { WorldIdentity } from '../types/identity';
import type { PondState, TileCoord } from '../types/pond';
import { WorldIdentityService } from '../identity/WorldIdentityService';
import { pondConfig, MILESTONE_POND } from '../config/pondConfig';
import { ecosystemProgression } from './EcosystemProgressionService';
import { islandConfig } from '../config/islandConfig';

export interface PondTickResult {
  pond: PondState | null;
  newWaterTiles: TileCoord[];
  changed: boolean;
}

/**
 * Deterministic pond generation — Bloom's first terrain evolution.
 *
 * Pure: same seed → same footprint and growth order, forever. No SQL, no
 * rendering, no Math.random(). Gated on DAY_13_POND_UNLOCKED. Produces the
 * footprint + which tiles newly become water; the caller mutates terrain via
 * TerrainService and persists.
 */
class PondGeneration {
  private isUnlocked(): boolean {
    return ecosystemProgression.isUnlocked(MILESTONE_POND);
  }

  private key(x: number, y: number): string {
    return `${x},${y}`;
  }

  private inBounds(x: number, y: number): boolean {
    const { size } = islandConfig.grid;
    return x >= 0 && x < size && y >= 0 && y < size;
  }

  /**
   * Build a deterministic connected blob from a single seeded stream.
   * Insertion order = reveal order, so the pond visibly forms.
   */
  private generateFootprint(identity: WorldIdentity): { footprint: TileCoord[]; finalSize: number } {
    const rng = WorldIdentityService.rng(identity, 'pond');
    const { size } = islandConfig.grid;

    const finalSize = rng.int(pondConfig.sizeMin, pondConfig.sizeMax);
    // Interior origin so the blob fits without clipping edges.
    const origin: TileCoord = {
      x: rng.int(2, size - 3),
      y: rng.int(2, size - 3),
    };

    const footprint: TileCoord[] = [origin];
    const inSet = new Set<string>([this.key(origin.x, origin.y)]);
    const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    while (footprint.length < finalSize) {
      // Candidate frontier: in-bounds neighbors not already in the set.
      const candidates: TileCoord[] = [];
      const seen = new Set<string>();
      for (const t of footprint) {
        for (const [dx, dy] of dirs) {
          const nx = t.x + dx;
          const ny = t.y + dy;
          const k = this.key(nx, ny);
          if (!this.inBounds(nx, ny) || inSet.has(k) || seen.has(k)) continue;
          seen.add(k);
          candidates.push({ x: nx, y: ny });
        }
      }
      if (candidates.length === 0) break;
      candidates.sort((a, b) => (a.x - b.x) || (a.y - b.y));
      const next = candidates[rng.int(0, candidates.length - 1)];
      footprint.push(next);
      inSet.add(this.key(next.x, next.y));
    }

    return { footprint, finalSize: footprint.length };
  }

  /** Tiles revealed for the current Bloom Day: 1 at unlock, +1 per day to final. */
  private desiredRevealed(bloomDays: number, finalSize: number): number {
    const elapsed = bloomDays - pondConfig.unlockBloomDay;
    const revealed = 1 + elapsed * pondConfig.expandPerBloomDay;
    return Math.max(1, Math.min(finalSize, revealed));
  }

  tick(identity: WorldIdentity, bloomDays: number, pond: PondState | null): PondTickResult {
    if (!this.isUnlocked()) {
      return { pond, newWaterTiles: [], changed: false };
    }

    // Create the footprint exactly once.
    let current = pond;
    let changed = false;
    if (!current) {
      const { footprint, finalSize } = this.generateFootprint(identity);
      current = { footprint, finalSize, revealedCount: 0, createdAtBloomDay: bloomDays };
      changed = true;
    }

    const desired = this.desiredRevealed(bloomDays, current.finalSize);
    if (desired <= current.revealedCount) {
      return { pond: current, newWaterTiles: [], changed };
    }

    const newWaterTiles = current.footprint.slice(current.revealedCount, desired);
    const next: PondState = { ...current, revealedCount: desired };
    return { pond: next, newWaterTiles, changed: true };
  }
}

export const pondGeneration = new PondGeneration();
