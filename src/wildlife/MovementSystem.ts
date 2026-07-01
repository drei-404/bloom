import type { TileGrid } from '../types/tile';
import type { Rng } from '../core/SeededRandom';
import type { AnimalAgent } from './types';
import { movementStrategyRegistry } from './movement/MovementStrategyRegistry';

interface TileXY {
  x: number;
  y: number;
}

/**
 * Applies the one-tile move intents produced by the Brain. It is the only system
 * allowed to change an animal's position, and it moves strictly one adjacent
 * tile at a time — never teleporting, never onto water or reserved terrain. The
 * Brain has already vetted walkability and reserved the target against other
 * animals; Movement re-checks terrain legality as a safety net and, on the (for
 * rabbit, unreachable) illegal case, abandons the move and settles to idle.
 *
 * No AI, no rendering. Sub-tile interpolation is a future renderer concern and
 * is intentionally out of scope here — positions remain tile-discrete, exactly
 * as the current renderer expects.
 */
class MovementSystem {
  /**
   * Choose a destination that keeps the animal inside its home territory. Among
   * the walkable neighbour candidates, prefer those within `radius` (Chebyshev)
   * of home; only when none are (the animal has drifted to the edge and is boxed
   * against the boundary) fall back to the candidates closest to home, so it
   * naturally drifts back. A single deterministic draw picks within the preferred
   * set — no pathfinding, no forced return. Candidates must be non-empty.
   */
  chooseHomewardStep<T extends TileXY>(candidates: T[], home: TileXY, radius: number, rng: Rng): T {
    const within = (c: T): boolean =>
      Math.abs(c.x - home.x) <= radius && Math.abs(c.y - home.y) <= radius;
    let pool = candidates.filter(within);
    if (pool.length === 0) {
      const dist = (c: T): number => Math.max(Math.abs(c.x - home.x), Math.abs(c.y - home.y));
      const min = Math.min(...candidates.map(dist));
      pool = candidates.filter(c => dist(c) === min);
    }
    return pool[rng.int(0, pool.length - 1)];
  }

  /** Apply `agent.intent` if present and legal. Returns whether the animal moved. */
  apply(agent: AnimalAgent, grid: TileGrid): boolean {
    const intent = agent.intent;
    agent.intent = null;
    if (!intent) return false;

    const { animal } = agent;
    const adjacent = Math.abs(intent.x - animal.tileX) + Math.abs(intent.y - animal.tileY) === 1;
    const strategy = movementStrategyRegistry.get(agent.config.movementType);

    if (!adjacent || !strategy.canOccupy(grid, intent.x, intent.y)) {
      // Should never happen for a Brain-vetted step; fail safe rather than teleport.
      animal.state = 'idle';
      return false;
    }

    animal.tileX = intent.x;
    animal.tileY = intent.y;
    animal.facing = intent.facing;
    return true;
  }
}

export const movementSystem = new MovementSystem();
