import { speciesRegistry } from './SpeciesRegistry';
import { SPECIES_RABBIT } from '../../config/rabbitConfig';
import { ASSET_IDS } from '../../assets/placeholderPack';
import type { SpeciesDefinition } from '../types';

/**
 * Rabbit — now just a registered species. Pure identity/metadata; all behaviour
 * comes from its `ground_herbivore` family. This registration (plus the family
 * and the asset) is the entire rabbit-specific footprint in the codebase.
 *
 * `affinities` here is spec-required species metadata; the ecosystem's native
 * selection currently reads affinities from the animal catalog (animalRegistry),
 * so rabbit also appears there. Behaviour is never duplicated.
 */
const rabbit: SpeciesDefinition = {
  species: SPECIES_RABBIT,
  label: 'Rabbit',
  family: 'ground_herbivore',
  movementType: 'walk',
  assetId: ASSET_IDS.animal(SPECIES_RABBIT),
  affinities: ['meadow'],
  homeRadius: 3,
  population: { min: 1, max: 3 },
  preferredTerrain: ['grass'],
  activityWindow: 'always',
};

speciesRegistry.register(rabbit);
