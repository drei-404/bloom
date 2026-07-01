import type { IAnimal } from '../animal/IAnimal';
import type { TileOccupant } from '../entity/occupancy';
import type { AnimalAgent, WildlifeContext } from './types';
import { speciesRegistry } from './species/SpeciesRegistry';
import { populationManager } from './PopulationManager';
import { animalBrainService } from './AnimalBrainService';
import { movementSystem } from './MovementSystem';
import { scheduleSystem } from './ScheduleSystem';
import { personalityService } from './PersonalityService';
import { interactionSystem } from './InteractionSystem';

// Species + family registration is owned by the Content Pack pipeline
// (`content/bootstrap.ts`), loaded once at startup. The simulation systems below
// read the registries and never change when content is added.

/**
 * The single Wildlife Simulation coordinator. Runs once per simulation tick and
 * drives the reusable systems in a fixed order:
 *
 *   PopulationManager → AnimalBrainService → MovementSystem → ScheduleSystem → InteractionSystem
 *
 * It returns the updated animal list and never renders or touches SQLite (the
 * caller persists via PersistenceService). Only species registered in the
 * wildlife config are managed; anything else is passed through untouched.
 *
 * Determinism note: each animal owns a seeded per-animal stream (salt
 * `${species}-behavior-${id}`). Because that stream is per-animal, running the
 * systems as phases across all animals still yields the exact same sequence of
 * draws each animal saw pre-migration (Brain: rest-check + step-pick, then
 * Schedule: duration), so rabbit's visible behaviour is unchanged.
 */
class WildlifeSimulationService {
  tick(ctx: WildlifeContext): { animals: IAnimal[]; changed: boolean } {
    // Work on clones; the store's objects are never mutated in place.
    let animals: IAnimal[] = ctx.animals.map(a => ({ ...a }));

    // 1. Population — spawn/despawn only.
    animals = populationManager.spawn(animals, ctx);
    let changed = animals.length !== ctx.animals.length;

    // Managed agents (species with a wildlife config). Others pass through.
    const agents: AnimalAgent[] = [];
    for (const animal of animals) {
      const config = speciesRegistry.resolve(animal.species);
      if (config) agents.push({ animal, config, intent: null, acted: false });
    }

    const liveIds = new Set(agents.map(a => a.animal.id));
    scheduleSystem.prune(liveIds);
    personalityService.prune(liveIds);

    // Shared occupancy: static occupants + every animal's current tile. The Brain
    // reserves chosen targets here so agents don't collide within a tick.
    const occupied: TileOccupant[] = [
      ...ctx.staticOccupants,
      ...animals.map(a => ({ tileX: a.tileX, tileY: a.tileY })),
    ];

    for (const agent of agents) {
      const { animal, config } = agent;

      // Immutable personality (assigned once, cached). Inert until behaviour
      // engines consume it; never affects movement today.
      personalityService.get(ctx.identity, animal.id);

      // Age tracks Bloom Days.
      const age = ctx.bloomDays - animal.createdAtBloomDay;
      if (age !== animal.ageDays) {
        animal.ageDays = age;
        changed = true;
      }

      // Ensure the timer exists (schedules the current state on first sight).
      scheduleSystem.ensure(agent, ctx.identity, ctx.nowMs);
      if (!scheduleSystem.isExpired(animal.id, ctx.nowMs)) continue;
      agent.acted = true;

      // 2. Brain — decide next state / intent (no movement).
      const phase = scheduleSystem.activityPhase(config, ctx.timeOfDay);
      animalBrainService.decide(agent, ctx.tileGrid, occupied, phase);

      // 3. Movement — apply the intended one-tile step.
      movementSystem.apply(agent, ctx.tileGrid);

      // 4. Schedule — reschedule the timer from the final resolved state.
      scheduleSystem.reschedule(agent, ctx.nowMs);

      changed = true;
    }

    // 5. Interaction — stub (no-op).
    interactionSystem.run(agents, ctx);

    return { animals, changed };
  }
}

export const wildlifeSimulationService = new WildlifeSimulationService();
