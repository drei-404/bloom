import type { TileGrid } from '../types/tile';
import type { AnimalAgent } from './types';
import { terrainService } from '../terrain/TerrainService';

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
  /** Apply `agent.intent` if present and legal. Returns whether the animal moved. */
  apply(agent: AnimalAgent, grid: TileGrid): boolean {
    const intent = agent.intent;
    agent.intent = null;
    if (!intent) return false;

    const { animal } = agent;
    const adjacent = Math.abs(intent.x - animal.tileX) + Math.abs(intent.y - animal.tileY) === 1;
    const onGrass = terrainService.terrainAt(grid, intent.x, intent.y) === 'grass';
    const reserved = terrainService.isReserved(intent.x, intent.y);

    if (!adjacent || !onGrass || reserved) {
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
