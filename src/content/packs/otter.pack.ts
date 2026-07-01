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
 * OtterPack — a Water species added entirely through the Content Pack pipeline
 * with no engine changes. Behaviour comes from the shared `ground_herbivore`
 * family; amphibious movement comes from the `swim` MovementStrategy. Data only —
 * no fishing, no sliding, no custom AI. A wide territory and small population
 * band are its only per-species knobs.
 */

const SPECIES_OTTER = 'otter';

const OTTER: SpeciesDefinition = {
  species: SPECIES_OTTER,
  label: 'Otter',
  family: 'ground_herbivore',
  movementType: 'swim',
  assetId: ASSET_IDS.animal(SPECIES_OTTER),
  affinities: ['wetland'],
  homeRadius: 6,
  population: { min: 1, max: 2 },
  preferredTerrain: ['grass'],
  activityWindow: 'day',
};

const OTTER_ASSETS: AssetPack = {
  id: 'bloom.otter.assets',
  assets: [
    {
      id: ASSET_IDS.animal(SPECIES_OTTER),
      category: 'animal',
      // Real art: shared 32x32 sheet sliced into per-frame textures with
      // idle/walking/sleeping clips. Renderer stays generic (no species code).
      ...animalSprite('/assets/otter.png'),
      // Placeholder palette kept as the sprite-load fallback — never a crash.
      metadata: { body: 0x6b4a33, dark: 0x3d2a1c } satisfies AnimalPalette,
    },
  ],
};

export const otterPack: ContentPack = {
  id: 'bloom.species.otter',
  version: '1.0.0',
  metadata: { displayName: 'Otter', family: 'ground_herbivore' },
  dependencies: [],

  register(): void {
    speciesRegistry.register(OTTER); // species + population
    assetRegistry.registerPack(OTTER_ASSETS); // asset (+ animation metadata when art ships)
    animalRegistry.register({
      species: OTTER.species,
      label: OTTER.label,
      affinities: OTTER.affinities,
    }); // ecosystem affinity for native selection
  },

  unregister(): void {
    speciesRegistry.unregister(OTTER.species);
    assetRegistry.unregisterPack(OTTER_ASSETS);
    animalRegistry.unregister(OTTER.species);
  },
};
