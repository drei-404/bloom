import type { TileGrid } from '../../types/tile';
import type { TileOccupant } from '../../entity/occupancy';
import type { TileCoord } from '../../animal/AnimalRegionService';

/**
 * A movement family's spatial rules — the only part of the Wildlife Simulation
 * that changes between a walker and a flyer. Everything else (FSM, schedule,
 * population, persistence, home-radius bias) is shared and unchanged.
 *
 * Strategies are keyed by a species' `movementType`. They are pure and
 * deterministic: no state, no randomness, no rendering.
 */
export interface MovementStrategy {
  /** Whether an animal may step onto (x, y) given current tile occupants. */
  canTraverse(grid: TileGrid, x: number, y: number, occupied: TileOccupant[]): boolean;
  /** Final terrain/bounds legality for a move (no occupancy) — MovementSystem safety. */
  canOccupy(grid: TileGrid, x: number, y: number): boolean;
  /** Valid spawn tiles for this movement family. */
  spawnTiles(grid: TileGrid, occupied: TileOccupant[]): TileCoord[];
}
