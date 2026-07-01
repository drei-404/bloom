import type { TileGrid } from '../types/tile';
import type { TileOccupant } from '../entity/occupancy';
import type { Facing } from '../animal/IAnimal';
import type { AnimalAgent, ActivityPhase } from './types';
import { animalRegionService } from '../animal/AnimalRegionService';
import { scheduleSystem } from './ScheduleSystem';

const DIRS: { dx: number; dy: number; facing: Facing }[] = [
  { dx: 1, dy: 0, facing: 'east' },
  { dx: -1, dy: 0, facing: 'west' },
  { dx: 0, dy: 1, facing: 'south' },
  { dx: 0, dy: -1, facing: 'north' },
];

/**
 * The reusable animal Finite State Machine. It only changes an animal's *state*
 * and, when it decides to wander, records a one-tile *intent* — it never mutates
 * the animal's position (that is MovementSystem's job) and contains no
 * species-specific code; every parameter comes from the species config.
 *
 * The rabbit's exact pre-migration decision sequence is preserved: on an idle
 * expiry it always draws one number for the rest check, then (if wandering) one
 * to pick a neighbour. Those draws come from the shared per-animal stream owned
 * by ScheduleSystem, so timing and placement are byte-identical.
 */
class AnimalBrainService {
  /**
   * Decide this tick for one agent. Mutates `agent.animal.state`, `agent.intent`
   * and `agent.acted`; reserves a chosen target tile in `occupied` so later
   * agents in the same tick won't pick it (matching the old single-loop
   * behaviour). No movement, no rendering, no SQL.
   */
  decide(agent: AnimalAgent, grid: TileGrid, occupied: TileOccupant[], phase: ActivityPhase): void {
    const { animal, config } = agent;
    const rng = scheduleSystem.rngFor(animal.id);

    if (animal.state === 'idle') {
      // Always consume one draw for the rest check (matches pre-migration order).
      const roll = rng.next();
      const canSleep = config.states.includes('sleeping');
      const mustRest = phase !== 'active';

      if (canSleep && (mustRest || roll < config.restChance)) {
        animal.state = 'sleeping';
        return;
      }

      if (config.states.includes('walking')) {
        const without = occupied.filter(
          o => !(o.tileX === animal.tileX && o.tileY === animal.tileY),
        );
        const candidates = DIRS.map(d => ({
          x: animal.tileX + d.dx,
          y: animal.tileY + d.dy,
          facing: d.facing,
        })).filter(c => animalRegionService.isWalkable(grid, c.x, c.y, without));

        if (candidates.length > 0) {
          const pick = candidates[rng.int(0, candidates.length - 1)];
          agent.intent = { x: pick.x, y: pick.y, facing: pick.facing };
          animal.state = 'walking';
          occupied.push({ tileX: pick.x, tileY: pick.y }); // reserve for later agents
          return;
        }
      }
      // Boxed in or can't walk — stay idle, timer reschedules.
      return;
    }

    // Any non-idle state (walking / sleeping / future eating / looking) settles
    // back to idle after its timer, ready for the next decision.
    animal.state = 'idle';
  }
}

export const animalBrainService = new AnimalBrainService();
