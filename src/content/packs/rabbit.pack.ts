import type { ContentPack } from '../ContentPack';
import type { SpeciesDefinition } from '../../wildlife/types';
import type { AssetPack } from '../../assets/AssetDescriptor';
import type { AnimalPalette } from '../../assets/placeholderPack';
import { SPECIES_RABBIT } from '../../config/rabbitConfig';
import { ASSET_IDS } from '../../assets/placeholderPack';
import { speciesRegistry } from '../../wildlife/species/SpeciesRegistry';
import { assetRegistry } from '../../assets/AssetRegistry';
import { animalRegistry } from '../../animal/AnimalRegistry';

/**
 * RabbitPack — the reference Content Pack. Everything rabbit-specific lives here:
 * its species definition (identity + population), its asset (placeholder palette
 * today; a spritesheet + animation clips later, same file), and its ecosystem
 * affinity. Behaviour comes from the `ground_herbivore` family (engine content,
 * a dependency), so this pack declares no behaviour.
 *
 * Values are rabbit's pre-pack config verbatim → gameplay is identical. Adding a
 * new species = copying this file and changing the data.
 */

const RABBIT: SpeciesDefinition = {
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

const RABBIT_ASSETS: AssetPack = {
  id: 'bloom.rabbit.assets',
  assets: [
    {
      id: ASSET_IDS.animal(SPECIES_RABBIT),
      category: 'animal',
      // Placeholder palette (primitive rendering). A future art revision adds
      // `spritesheet` + `frames` + `animations` here — no other file changes.
      metadata: { body: 0xd8cfc0, dark: 0xb8ae9c } satisfies AnimalPalette,
    },
  ],
};

export const rabbitPack: ContentPack = {
  id: 'bloom.species.rabbit',
  version: '1.0.0',
  metadata: { displayName: 'Rabbit', family: 'ground_herbivore' },
  // The ground_herbivore family is engine content registered before packs load.
  dependencies: [],

  register(): void {
    // registerSpecies (+ population, which lives in the definition)
    speciesRegistry.register(RABBIT);
    // registerAssets (+ animation metadata, when art ships)
    assetRegistry.registerPack(RABBIT_ASSETS);
    // register ecosystem affinity so worlds can discover rabbit as a native
    animalRegistry.register({
      species: RABBIT.species,
      label: RABBIT.label,
      affinities: RABBIT.affinities,
    });
  },

  unregister(): void {
    speciesRegistry.unregister(RABBIT.species);
    assetRegistry.unregister(ASSET_IDS.animal(SPECIES_RABBIT));
    animalRegistry.unregister(RABBIT.species);
  },
};
