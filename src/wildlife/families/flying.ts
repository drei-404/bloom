import { speciesRegistry } from '../species/SpeciesRegistry';
import type { FamilyBehavior } from '../types';

/**
 * Flying family behaviour — shared by every future flyer (butterfly, owl,
 * woodpecker). Reuses the same FSM as ground herbivores (idle → wander / rest),
 * only tuned to be more active. Its distinct spatial movement comes from the
 * `fly` MovementStrategy, not from this behaviour. No species are defined here.
 */
const flying: FamilyBehavior = {
  family: 'flying',
  states: ['idle', 'walking', 'sleeping'],
  restChance: 0.15,
  spawn: {
    // Flyers aren't tied to vegetation; they spawn anywhere in bounds.
    preferNearVegetation: false,
    preferRadius: 0,
  },
  timers: {
    idleMin: 60,
    idleMax: 150,
    walkMin: 5,
    walkMax: 20,
    sleepMin: 60,
    sleepMax: 180,
  },
};

speciesRegistry.registerFamily(flying);
