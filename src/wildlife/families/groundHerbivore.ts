import { speciesRegistry } from '../species/SpeciesRegistry';
import type { FamilyBehavior } from '../types';

/**
 * Ground herbivore behaviour: the calm idle → wander / rest FSM rabbits use
 * today and every future grazing land animal (deer, hedgehog, …) will inherit
 * unchanged. Behaviour lives here, on the family — species definitions carry no
 * behaviour. These values are rabbit's pre-framework timings, so gameplay is
 * identical.
 */
const groundHerbivore: FamilyBehavior = {
  family: 'ground_herbivore',
  states: ['idle', 'walking', 'sleeping'],
  restChance: 0.3,
  spawn: {
    preferNearVegetation: true,
    preferRadius: 2,
  },
  timers: {
    idleMin: 120,
    idleMax: 300,
    walkMin: 5,
    walkMax: 15,
    sleepMin: 60,
    sleepMax: 180,
  },
};

speciesRegistry.registerFamily(groundHerbivore);
