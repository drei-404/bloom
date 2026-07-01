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
 * WoodpeckerPack — a forest flyer added entirely through the Content Pack
 * pipeline with no engine changes. Behaviour comes from the shared `flying`
 * family and the `fly` MovementStrategy; this pack declares only data — no
 * pecking, no tree interaction, no custom AI. Its per-species knobs are a
 * daytime schedule, a tighter territory and a slightly larger population band.
 */

const SPECIES_WOODPECKER = 'woodpecker';

const WOODPECKER: SpeciesDefinition = {
  species: SPECIES_WOODPECKER,
  label: 'Woodpecker',
  family: 'flying',
  movementType: 'fly',
  assetId: ASSET_IDS.animal(SPECIES_WOODPECKER),
  affinities: ['forest'],
  homeRadius: 5,
  population: { min: 2, max: 3 },
  preferredTerrain: ['grass'],
  activityWindow: 'day',
};

const WOODPECKER_ASSETS: AssetPack = {
  id: 'bloom.woodpecker.assets',
  assets: [
    {
      id: ASSET_IDS.animal(SPECIES_WOODPECKER),
      category: 'animal',
      // Real art: shared 32x32 sheet sliced into per-frame textures with
      // idle/walking/sleeping clips. Renderer stays generic (no species code).
      ...animalSprite('/assets/woodpecker.png'),
      // Placeholder palette kept as the sprite-load fallback — never a crash.
      metadata: { body: 0x2b2b2b, dark: 0xc0392b } satisfies AnimalPalette,
    },
  ],
};

export const woodpeckerPack: ContentPack = {
  id: 'bloom.species.woodpecker',
  version: '1.0.0',
  metadata: { displayName: 'Woodpecker', family: 'flying' },
  dependencies: [],

  register(): void {
    speciesRegistry.register(WOODPECKER); // species + population
    assetRegistry.registerPack(WOODPECKER_ASSETS); // asset (+ animation metadata when art ships)
    animalRegistry.register({
      species: WOODPECKER.species,
      label: WOODPECKER.label,
      affinities: WOODPECKER.affinities,
    }); // ecosystem affinity for native selection
  },

  unregister(): void {
    speciesRegistry.unregister(WOODPECKER.species);
    assetRegistry.unregisterPack(WOODPECKER_ASSETS);
    animalRegistry.unregister(WOODPECKER.species);
  },
};
