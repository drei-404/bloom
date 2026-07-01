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
 * OwlPack — a forest flyer added entirely through the Content Pack pipeline with
 * no engine changes. Behaviour comes from the shared `flying` family (FSM +
 * timing) and the `fly` MovementStrategy; this pack declares only data — no
 * perching, no hunting, no nests (the engine has none, and none are added). Its
 * one config-only difference from the butterfly is a nocturnal schedule.
 */

const SPECIES_OWL = 'owl';

const OWL: SpeciesDefinition = {
  species: SPECIES_OWL,
  label: 'Owl',
  family: 'flying',
  movementType: 'fly',
  assetId: ASSET_IDS.animal(SPECIES_OWL),
  affinities: ['forest'],
  homeRadius: 7,
  population: { min: 1, max: 2 },
  preferredTerrain: ['grass'],
  activityWindow: 'night',
};

const OWL_ASSETS: AssetPack = {
  id: 'bloom.owl.assets',
  assets: [
    {
      id: ASSET_IDS.animal(SPECIES_OWL),
      category: 'animal',
      // Real art: shared 32x32 sheet sliced into per-frame textures with
      // idle/walking/sleeping clips. Renderer stays generic (no species code).
      ...animalSprite('/assets/owl.png'),
      // Placeholder palette kept as the sprite-load fallback — never a crash.
      metadata: { body: 0x7a6a55, dark: 0x463c30 } satisfies AnimalPalette,
    },
  ],
};

export const owlPack: ContentPack = {
  id: 'bloom.species.owl',
  version: '1.0.0',
  metadata: { displayName: 'Owl', family: 'flying' },
  dependencies: [],

  register(): void {
    speciesRegistry.register(OWL); // species + population
    assetRegistry.registerPack(OWL_ASSETS); // asset (+ animation metadata when art ships)
    animalRegistry.register({
      species: OWL.species,
      label: OWL.label,
      affinities: OWL.affinities,
    }); // ecosystem affinity for native selection
  },

  unregister(): void {
    speciesRegistry.unregister(OWL.species);
    assetRegistry.unregister(ASSET_IDS.animal(SPECIES_OWL));
    animalRegistry.unregister(OWL.species);
  },
};
