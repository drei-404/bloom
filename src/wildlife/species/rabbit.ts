import { wildlifeConfigRegistry } from '../WildlifeConfigRegistry';
import { rabbitConfig, SPECIES_RABBIT } from '../../config/rabbitConfig';
import type { WildlifeSpeciesConfig } from '../types';

/**
 * Rabbit as pure data. Values mirror the pre-migration behaviour exactly so the
 * visible ecosystem is unchanged — this registration is all that ties rabbit to
 * the reusable Wildlife Simulation systems.
 *
 * `activityWindow: 'always'` keeps the current behaviour (rabbits ignore
 * day/night); a future nocturnal species just sets 'night' with no code change.
 */
const rabbitWildlifeConfig: WildlifeSpeciesConfig = {
  species: SPECIES_RABBIT,
  family: 'rodent',
  movementSpeed: 1,
  populationMin: 1,
  populationMax: rabbitConfig.maxPopulation,
  preferredTerrain: ['grass'],
  spawn: {
    preferNearVegetation: true,
    preferRadius: rabbitConfig.preferRadius,
  },
  activityWindow: 'always',
  restChance: rabbitConfig.sleepChance,
  states: ['idle', 'walking', 'sleeping'],
  timers: rabbitConfig.timers,
};

wildlifeConfigRegistry.register(rabbitWildlifeConfig);
