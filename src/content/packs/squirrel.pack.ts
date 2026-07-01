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
 * SquirrelPack — a forest ground herbivore added entirely through the Content
 * Pack pipeline with no engine changes. Behaviour comes from the shared
 * `ground_herbivore` family and the `walk` MovementStrategy; this pack declares
 * only data (no tree climbing, no needs — engine has none, and none are added).
 * Its per-species knobs are a wider territory and a larger population band.
 */

const SPECIES_SQUIRREL = 'squirrel';

const SQUIRREL: SpeciesDefinition = {
  species: SPECIES_SQUIRREL,
  label: 'Squirrel',
  family: 'ground_herbivore',
  movementType: 'walk',
  assetId: ASSET_IDS.animal(SPECIES_SQUIRREL),
  affinities: ['forest'],
  homeRadius: 5,
  population: { min: 3, max: 5 },
  preferredTerrain: ['grass'],
  activityWindow: 'day',
};

const SQUIRREL_ASSETS: AssetPack = {
  id: 'bloom.squirrel.assets',
  assets: [
    {
      id: ASSET_IDS.animal(SPECIES_SQUIRREL),
      category: 'animal',
      // Real art: shared 32x32 sheet sliced into per-frame textures with
      // idle/walking/sleeping clips. Renderer stays generic (no species code).
      ...animalSprite('/assets/squirrel.png'),
      // Placeholder palette kept as the sprite-load fallback — never a crash.
      metadata: { body: 0xb5651d, dark: 0x7a3f0f } satisfies AnimalPalette,
    },
  ],
};

export const squirrelPack: ContentPack = {
  id: 'bloom.species.squirrel',
  version: '1.0.0',
  metadata: { displayName: 'Squirrel', family: 'ground_herbivore' },
  dependencies: [],

  register(): void {
    speciesRegistry.register(SQUIRREL); // species + population
    assetRegistry.registerPack(SQUIRREL_ASSETS); // asset (+ animation metadata when art ships)
    animalRegistry.register({
      species: SQUIRREL.species,
      label: SQUIRREL.label,
      affinities: SQUIRREL.affinities,
    }); // ecosystem affinity for native selection
  },

  unregister(): void {
    speciesRegistry.unregister(SQUIRREL.species);
    assetRegistry.unregisterPack(SQUIRREL_ASSETS);
    animalRegistry.unregister(SQUIRREL.species);
  },
};
