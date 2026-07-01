import type { IAnimal } from '../animal/IAnimal';
import type { AnimalAgent, WildlifeContext } from './types';

/**
 * Stub for future animal-to-animal interaction (observation, curiosity, social
 * behaviour). It has NO gameplay effect yet — the API is defined so later
 * milestones can add predator/prey, flocking, etc. without touching the rest of
 * the simulation. `run` returns its input unchanged.
 */
class InteractionSystem {
  /** Placeholder pipeline stage — currently a no-op. */
  run(_agents: AnimalAgent[], _ctx: WildlifeContext): void {
    // Intentionally empty until interactions are designed.
  }

  /** Future: what an animal notices around it. */
  observe(_agent: AnimalAgent, _ctx: WildlifeContext): void {
    // no-op stub
  }

  /** Future: an animal acting on another. */
  interact(_a: AnimalAgent, _b: AnimalAgent, _ctx: WildlifeContext): void {
    // no-op stub
  }

  /** Animals within `radius` tiles of the given one (excludes itself). */
  findNearbyAnimals(animal: IAnimal, animals: IAnimal[], radius: number): IAnimal[] {
    return animals.filter(
      other =>
        other.id !== animal.id &&
        Math.abs(other.tileX - animal.tileX) <= radius &&
        Math.abs(other.tileY - animal.tileY) <= radius,
    );
  }
}

export const interactionSystem = new InteractionSystem();
