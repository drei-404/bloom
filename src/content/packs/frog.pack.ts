import type { ContentPack } from '../ContentPack';
import type { SpeciesDefinition } from '../../wildlife/types';
import type { AssetPack } from '../../assets/AssetDescriptor';
import type { AnimalPalette } from '../../assets/placeholderPack';
import { ASSET_IDS } from '../../assets/placeholderPack';
import { animalSprite } from '../../assets/animalSprite';
import { speciesRegistry } from '../../wildlife/species/SpeciesRegistry';
import { assetRegistry } from '../../assets/AssetRegistry';
import { animalRegistry } from '../../animal/AnimalRegistry';

/**
 * FrogPack — a Water species added entirely through the Content Pack pipeline
 * with no engine changes. Behaviour comes from the shared `ground_herbivore`
 * family; amphibious movement comes from the `swim` MovementStrategy. Data only —
 * no jumping, no croaking, no custom AI. Its config-only differences are a
 * nocturnal schedule, a tight territory and the largest population band here.
 */

const SPECIES_FROG = 'frog';

const FROG: SpeciesDefinition = {
  species: SPECIES_FROG,
  label: 'Frog',
  family: 'ground_herbivore',
  movementType: 'swim',
  assetId: ASSET_IDS.animal(SPECIES_FROG),
  affinities: ['wetland'],
  homeRadius: 3,
  population: { min: 3, max: 6 },
  preferredTerrain: ['grass'],
  activityWindow: 'night',
};

const FROG_ASSETS: AssetPack = {
  id: 'bloom.frog.assets',
  assets: [
    {
      id: ASSET_IDS.animal(SPECIES_FROG),
      category: 'animal',
      // Real art: shared 32x32 sheet sliced into per-frame textures with
      // idle/walking/sleeping clips. Renderer stays generic (no species code).
      ...animalSprite('/assets/frog.png'),
      // Placeholder palette kept as the sprite-load fallback — never a crash.
      metadata: { body: 0x5a9e3a, dark: 0x2f5d22 } satisfies AnimalPalette,
    },
  ],
};

export const frogPack: ContentPack = {
  id: 'bloom.species.frog',
  version: '1.0.0',
  metadata: { displayName: 'Frog', family: 'ground_herbivore' },
  dependencies: [],

  register(): void {
    speciesRegistry.register(FROG); // species + population
    assetRegistry.registerPack(FROG_ASSETS); // asset (+ animation metadata when art ships)
    animalRegistry.register({
      species: FROG.species,
      label: FROG.label,
      affinities: FROG.affinities,
    }); // ecosystem affinity for native selection
  },

  unregister(): void {
    speciesRegistry.unregister(FROG.species);
    assetRegistry.unregister(ASSET_IDS.animal(SPECIES_FROG));
    animalRegistry.unregister(FROG.species);
  },
};
