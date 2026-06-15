import type { TileGrid } from '../types/tile';
import type { IAnimal, AnimalState, Facing } from '../animal/IAnimal';
import type { TileOccupant } from '../entity/occupancy';
import type { WorldIdentity } from '../types/identity';
import type { Rng } from '../core/SeededRandom';
import { WorldIdentityService } from '../identity/WorldIdentityService';
import { animalRegionService } from '../animal/AnimalRegionService';
import { rabbitConfig, SPECIES_RABBIT } from '../config/rabbitConfig';

interface TimerEntry {
  endsAt: number;
  rng: Rng;
}

export interface RabbitBehaviorInput {
  animals: IAnimal[];
  tileGrid: TileGrid;
  /** Non-animal occupants (entities + decorations). */
  occupants: TileOccupant[];
  identity: WorldIdentity;
  bloomDays: number;
  nowMs: number;
}

const DIRS: { dx: number; dy: number; facing: Facing }[] = [
  { dx: 1, dy: 0, facing: 'east' },
  { dx: -1, dy: 0, facing: 'west' },
  { dx: 0, dy: 1, facing: 'south' },
  { dx: 0, dy: -1, facing: 'north' },
];

/**
 * Rabbit state machine + one-tile movement. Timestamp-driven (FPS-independent).
 * Timers are in-memory only — state/position/facing persist via the animals
 * table; timers re-seed on load. No pathfinding, no needs. Calm ecosystem.
 */
class RabbitBehavior {
  private timers = new Map<string, TimerEntry>();

  private durationMs(rng: Rng, min: number, max: number): number {
    return rng.range(min, max) * 1000;
  }

  private scheduleFor(state: AnimalState, rng: Rng, nowMs: number): number {
    const t = rabbitConfig.timers;
    const seconds =
      state === 'walking'
        ? this.durationMs(rng, t.walkMin, t.walkMax)
        : state === 'sleeping'
          ? this.durationMs(rng, t.sleepMin, t.sleepMax)
          : this.durationMs(rng, t.idleMin, t.idleMax);
    return nowMs + seconds;
  }

  private ensureTimer(rabbit: IAnimal, identity: WorldIdentity, nowMs: number): TimerEntry {
    let entry = this.timers.get(rabbit.id);
    if (!entry) {
      const rng = WorldIdentityService.rng(identity, `rabbit-behavior-${rabbit.id}`);
      entry = { rng, endsAt: this.scheduleFor(rabbit.state, rng, nowMs) };
      this.timers.set(rabbit.id, entry);
    }
    return entry;
  }

  /** Pick a deterministic walkable neighbor (≤1 tile); returns null if none. */
  private pickStep(
    rabbit: IAnimal,
    grid: TileGrid,
    occupied: TileOccupant[],
    rng: Rng,
  ): { x: number; y: number; facing: Facing } | null {
    const candidates = DIRS.map(d => ({
      x: rabbit.tileX + d.dx,
      y: rabbit.tileY + d.dy,
      facing: d.facing,
    })).filter(c => animalRegionService.isWalkable(grid, c.x, c.y, occupied));
    if (candidates.length === 0) return null;
    return candidates[rng.int(0, candidates.length - 1)];
  }

  tick(input: RabbitBehaviorInput): { animals: IAnimal[]; changed: boolean } {
    const { tileGrid, occupants, identity, bloomDays, nowMs } = input;
    let changed = false;

    // Live rabbit ids for timer pruning.
    const liveIds = new Set(
      input.animals.filter(a => a.species === SPECIES_RABBIT).map(a => a.id),
    );
    for (const id of this.timers.keys()) {
      if (!liveIds.has(id)) this.timers.delete(id);
    }

    // Occupancy for movement: other animals + static occupants (updated as we move).
    const occupied: TileOccupant[] = [...occupants];
    const result = input.animals.map(a => ({ ...a }));

    // Seed occupied with every rabbit's current tile.
    for (const a of result) {
      if (a.species === SPECIES_RABBIT) occupied.push({ tileX: a.tileX, tileY: a.tileY });
    }

    for (const rabbit of result) {
      if (rabbit.species !== SPECIES_RABBIT) continue;

      // Age tracks Bloom Days (no separate age system).
      const age = bloomDays - rabbit.createdAtBloomDay;
      if (age !== rabbit.ageDays) {
        rabbit.ageDays = age;
        changed = true;
      }

      const entry = this.ensureTimer(rabbit, identity, nowMs);
      if (nowMs < entry.endsAt) continue;

      const rng = entry.rng;
      if (rabbit.state === 'idle') {
        if (rng.next() < rabbitConfig.sleepChance) {
          rabbit.state = 'sleeping';
        } else {
          // Walk: hop one walkable tile (occupancy excludes this rabbit's own tile).
          const without = occupied.filter(
            o => !(o.tileX === rabbit.tileX && o.tileY === rabbit.tileY),
          );
          const step = this.pickStep(rabbit, tileGrid, without, rng);
          if (step) {
            rabbit.tileX = step.x;
            rabbit.tileY = step.y;
            rabbit.facing = step.facing;
            rabbit.state = 'walking';
            // Reflect the new tile in occupancy for subsequent rabbits.
            occupied.push({ tileX: step.x, tileY: step.y });
          } else {
            rabbit.state = 'idle'; // boxed in — stay idle, reschedule
          }
        }
      } else {
        // walking → idle, sleeping → idle
        rabbit.state = 'idle';
      }

      entry.endsAt = this.scheduleFor(rabbit.state, rng, nowMs);
      changed = true;
    }

    return { animals: result, changed };
  }
}

export const rabbitBehavior = new RabbitBehavior();
