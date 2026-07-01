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
 * DuckPack — the first Water species, added entirely through the Content Pack
 * pipeline with no engine changes. Behaviour comes from the shared
 * `ground_herbivore` family (FSM + timing); its amphibious movement comes from
 * the `swim` MovementStrategy (grass + water, pond-edge spawning). This pack
 * declares only data — no fishing, no diving, no flocking, no custom AI.
 */

const SPECIES_DUCK = 'duck';

const DUCK: SpeciesDefinition = {
  species: SPECIES_DUCK,
  label: 'Duck',
  family: 'ground_herbivore',
  movementType: 'swim',
  assetId: ASSET_IDS.animal(SPECIES_DUCK),
  affinities: ['wetland'],
  homeRadius: 5,
  population: { min: 2, max: 4 },
  preferredTerrain: ['grass'],
  activityWindow: 'day',
};

const DUCK_ASSETS: AssetPack = {
  id: 'bloom.duck.assets',
  assets: [
    {
      id: ASSET_IDS.animal(SPECIES_DUCK),
      category: 'animal',
      // Real art: shared 32x32 sheet sliced into per-frame textures with
      // idle/walking/sleeping clips. Renderer stays generic (no species code).
      ...animalSprite('/assets/duck.png'),
      // Placeholder palette kept as the sprite-load fallback — never a crash.
      metadata: { body: 0xe6c34a, dark: 0x3a6b3a } satisfies AnimalPalette,
    },
  ],
};

export const duckPack: ContentPack = {
  id: 'bloom.species.duck',
  version: '1.0.0',
  metadata: { displayName: 'Duck', family: 'ground_herbivore' },
  dependencies: [],

  register(): void {
    speciesRegistry.register(DUCK); // species + population
    assetRegistry.registerPack(DUCK_ASSETS); // asset (+ animation metadata when art ships)
    animalRegistry.register({
      species: DUCK.species,
      label: DUCK.label,
      affinities: DUCK.affinities,
    }); // ecosystem affinity for native selection
  },

  unregister(): void {
    speciesRegistry.unregister(DUCK.species);
    assetRegistry.unregister(ASSET_IDS.animal(SPECIES_DUCK));
    animalRegistry.unregister(DUCK.species);
  },
};
