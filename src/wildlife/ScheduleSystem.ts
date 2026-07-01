import type { Rng } from '../core/SeededRandom';
import type { WorldIdentity } from '../types/identity';
import type { AnimalState } from '../animal/IAnimal';
import type { AnimalAgent, ActivityPhase, ResolvedSpecies } from './types';
import { WorldIdentityService } from '../identity/WorldIdentityService';

interface TimerEntry {
  endsAt: number;
  rng: Rng;
}

/**
 * Owns per-animal activity timing for the Wildlife Simulation.
 *
 * Two responsibilities:
 *  - **State timers**: how long an animal stays in its current state. Durations
 *    are picked deterministically from the species' seeded per-animal stream
 *    (salt `${species}-behavior-${id}`). This stream is shared with the Brain so
 *    the sequence of random draws exactly matches the pre-migration rabbit — the
 *    Brain draws decisions, this system draws durations, in per-animal order.
 *  - **Activity phase**: whether the species is active/resting per the world
 *    day/night cycle and its configured window. Rabbit uses 'always', so its
 *    phase is permanently 'active' and its visible behaviour is unchanged.
 *
 * Timers live in memory only (re-seeded on load), exactly like the old service.
 */
class ScheduleSystem {
  private readonly timers = new Map<string, TimerEntry>();

  private durationMs(rng: Rng, min: number, max: number): number {
    return rng.range(min, max) * 1000;
  }

  private scheduleFor(config: ResolvedSpecies, state: AnimalState, rng: Rng): number {
    const t = config.behavior.timers;
    if (state === 'walking') return this.durationMs(rng, t.walkMin, t.walkMax);
    if (state === 'sleeping') return this.durationMs(rng, t.sleepMin, t.sleepMax);
    return this.durationMs(rng, t.idleMin, t.idleMax);
  }

  /** Create the timer + seeded stream on first sighting, scheduling the current state. */
  ensure(agent: AnimalAgent, identity: WorldIdentity, nowMs: number): void {
    if (this.timers.has(agent.animal.id)) return;
    const rng = WorldIdentityService.rng(identity, `${agent.animal.species}-behavior-${agent.animal.id}`);
    const endsAt = nowMs + this.scheduleFor(agent.config, agent.animal.state, rng);
    this.timers.set(agent.animal.id, { rng, endsAt });
  }

  isExpired(id: string, nowMs: number): boolean {
    const entry = this.timers.get(id);
    return entry ? nowMs >= entry.endsAt : false;
  }

  /** The animal's shared per-animal stream (Brain uses this for its decisions). */
  rngFor(id: string): Rng {
    const entry = this.timers.get(id);
    if (!entry) throw new Error(`no timer for animal ${id}; call ensure() first`);
    return entry.rng;
  }

  /** Schedule the next expiry from the animal's final resolved state. */
  reschedule(agent: AnimalAgent, nowMs: number): void {
    const entry = this.timers.get(agent.animal.id);
    if (!entry) return;
    entry.endsAt = nowMs + this.scheduleFor(agent.config, agent.animal.state, entry.rng);
  }

  /**
   * Whether the species is awake now. 'always' → always active (rabbit today).
   * 'day'/'night' gate on the world day/night cycle for future species.
   */
  activityPhase(config: ResolvedSpecies, timeOfDay: number): ActivityPhase {
    if (config.activityWindow === 'always') return 'active';
    const isDay = timeOfDay >= 0.25 && timeOfDay < 0.75;
    const awake = config.activityWindow === 'day' ? isDay : !isDay;
    return awake ? 'active' : 'sleeping';
  }

  prune(liveIds: Set<string>): void {
    for (const id of this.timers.keys()) {
      if (!liveIds.has(id)) this.timers.delete(id);
    }
  }
}

export const scheduleSystem = new ScheduleSystem();
