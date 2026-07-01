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
 * HedgehogPack — a ground herbivore added entirely through the Content Pack
 * pipeline with no engine changes. Behaviour comes from the shared
 * `ground_herbivore` family (FSM + timing) and the `walk` MovementStrategy; this
 * pack declares only data. Its one real, config-only difference from the meadow
 * rabbit is a nocturnal schedule (`activityWindow: 'night'`).
 */

const SPECIES_HEDGEHOG = 'hedgehog';

const HEDGEHOG: SpeciesDefinition = {
  species: SPECIES_HEDGEHOG,
  label: 'Hedgehog',
  family: 'ground_herbivore',
  movementType: 'walk',
  assetId: ASSET_IDS.animal(SPECIES_HEDGEHOG),
  affinities: ['meadow'],
  homeRadius: 3,
  population: { min: 1, max: 2 },
  preferredTerrain: ['grass'],
  activityWindow: 'night',
};

const HEDGEHOG_ASSETS: AssetPack = {
  id: 'bloom.hedgehog.assets',
  assets: [
    {
      id: ASSET_IDS.animal(SPECIES_HEDGEHOG),
      category: 'animal',
      // Real art: shared 32x32 sheet sliced into per-frame textures with
      // idle/walking/sleeping clips. Renderer stays generic (no species code).
      ...animalSprite('/assets/hedgehog.png'),
      // Placeholder palette kept as the sprite-load fallback — never a crash.
      metadata: { body: 0x8a6d4f, dark: 0x4a3826 } satisfies AnimalPalette,
    },
  ],
};

export const hedgehogPack: ContentPack = {
  id: 'bloom.species.hedgehog',
  version: '1.0.0',
  metadata: { displayName: 'Hedgehog', family: 'ground_herbivore' },
  dependencies: [],

  register(): void {
    speciesRegistry.register(HEDGEHOG); // species + population
    assetRegistry.registerPack(HEDGEHOG_ASSETS); // asset (+ animation metadata when art ships)
    animalRegistry.register({
      species: HEDGEHOG.species,
      label: HEDGEHOG.label,
      affinities: HEDGEHOG.affinities,
    }); // ecosystem affinity for native selection
  },

  unregister(): void {
    speciesRegistry.unregister(HEDGEHOG.species);
    assetRegistry.unregisterPack(HEDGEHOG_ASSETS);
    animalRegistry.unregister(HEDGEHOG.species);
  },
};
