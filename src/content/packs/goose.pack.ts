import type { ContentPack } from '../ContentPack';
import type { SpeciesDefinition } from '../../wildlife/types';
import type { AssetPack } from '../../assets/AssetDescriptor';
import type { AnimalPalette } from '../../assets/placeholderPack';
import { ASSET_IDS } from '../../assets/placeholderPack';
import { speciesRegistry } from '../../wildlife/species/SpeciesRegistry';
import { assetRegistry } from '../../assets/AssetRegistry';
import { animalRegistry } from '../../animal/AnimalRegistry';

/**
 * GoosePack — a Water species added entirely through the Content Pack pipeline
 * with no engine changes. Behaviour comes from the shared `ground_herbivore`
 * family; amphibious movement comes from the `swim` MovementStrategy. Data only —
 * no flocking, no honking, no custom AI. Differs from the duck by a wider
 * territory alone.
 */

const SPECIES_GOOSE = 'goose';

const GOOSE: SpeciesDefinition = {
  species: SPECIES_GOOSE,
  label: 'Goose',
  family: 'ground_herbivore',
  movementType: 'swim',
  assetId: ASSET_IDS.animal(SPECIES_GOOSE),
  affinities: ['wetland'],
  homeRadius: 6,
  population: { min: 2, max: 4 },
  preferredTerrain: ['grass'],
  activityWindow: 'day',
};

const GOOSE_ASSETS: AssetPack = {
  id: 'bloom.goose.assets',
  assets: [
    {
      id: ASSET_IDS.animal(SPECIES_GOOSE),
      category: 'animal',
      // Placeholder palette only — no artwork, no animation clips. A future art
      // revision adds spritesheet/frames/animations here with no other changes.
      metadata: { body: 0xd8d8d0, dark: 0x555148 } satisfies AnimalPalette,
    },
  ],
};

export const goosePack: ContentPack = {
  id: 'bloom.species.goose',
  version: '1.0.0',
  metadata: { displayName: 'Goose', family: 'ground_herbivore' },
  dependencies: [],

  register(): void {
    speciesRegistry.register(GOOSE); // species + population
    assetRegistry.registerPack(GOOSE_ASSETS); // asset (+ animation metadata when art ships)
    animalRegistry.register({
      species: GOOSE.species,
      label: GOOSE.label,
      affinities: GOOSE.affinities,
    }); // ecosystem affinity for native selection
  },

  unregister(): void {
    speciesRegistry.unregister(GOOSE.species);
    assetRegistry.unregister(ASSET_IDS.animal(SPECIES_GOOSE));
    animalRegistry.unregister(GOOSE.species);
  },
};
