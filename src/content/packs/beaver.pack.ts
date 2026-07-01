import type { ContentPack } from '../ContentPack';
import type { SpeciesDefinition } from '../../wildlife/types';
import type { AssetPack } from '../../assets/AssetDescriptor';
import type { AnimalPalette } from '../../assets/placeholderPack';
import { ASSET_IDS } from '../../assets/placeholderPack';
import { speciesRegistry } from '../../wildlife/species/SpeciesRegistry';
import { assetRegistry } from '../../assets/AssetRegistry';
import { animalRegistry } from '../../animal/AnimalRegistry';

/**
 * BeaverPack — a wetland ground herbivore added entirely through the Content
 * Pack pipeline with no engine changes. Despite living near water it reuses the
 * `ground_herbivore` family and the `walk` MovementStrategy exactly (grass only,
 * never water) — no dam building, no swimming, no needs. Those would be engine
 * changes and are out of scope; the beaver is data-only, proving a brand-new
 * species (not previously in the catalog) plugs in with configuration alone.
 */

const SPECIES_BEAVER = 'beaver';

const BEAVER: SpeciesDefinition = {
  species: SPECIES_BEAVER,
  label: 'Beaver',
  family: 'ground_herbivore',
  movementType: 'walk',
  assetId: ASSET_IDS.animal(SPECIES_BEAVER),
  affinities: ['wetland'],
  homeRadius: 4,
  population: { min: 2, max: 3 },
  preferredTerrain: ['grass'],
  activityWindow: 'day',
};

const BEAVER_ASSETS: AssetPack = {
  id: 'bloom.beaver.assets',
  assets: [
    {
      id: ASSET_IDS.animal(SPECIES_BEAVER),
      category: 'animal',
      // Placeholder palette only — no artwork, no animation clips. A future art
      // revision adds spritesheet/frames/animations here with no other changes.
      metadata: { body: 0x6b4a2a, dark: 0x3d2817 } satisfies AnimalPalette,
    },
  ],
};

export const beaverPack: ContentPack = {
  id: 'bloom.species.beaver',
  version: '1.0.0',
  metadata: { displayName: 'Beaver', family: 'ground_herbivore' },
  dependencies: [],

  register(): void {
    speciesRegistry.register(BEAVER); // species + population
    assetRegistry.registerPack(BEAVER_ASSETS); // asset (+ animation metadata when art ships)
    animalRegistry.register({
      species: BEAVER.species,
      label: BEAVER.label,
      affinities: BEAVER.affinities,
    }); // ecosystem affinity for native selection
  },

  unregister(): void {
    speciesRegistry.unregister(BEAVER.species);
    assetRegistry.unregister(ASSET_IDS.animal(SPECIES_BEAVER));
    animalRegistry.unregister(BEAVER.species);
  },
};
