import type { ContentPack } from '../ContentPack';
import type { SpeciesDefinition } from '../../wildlife/types';
import type { AssetPack } from '../../assets/AssetDescriptor';
import type { AnimalPalette } from '../../assets/placeholderPack';
import { ASSET_IDS } from '../../assets/placeholderPack';
import { speciesRegistry } from '../../wildlife/species/SpeciesRegistry';
import { assetRegistry } from '../../assets/AssetRegistry';
import { animalRegistry } from '../../animal/AnimalRegistry';

/**
 * FoxPack — a land mammal added entirely through the Content Pack pipeline with
 * no engine changes. Fox reuses the `ground_herbivore` family (same FSM,
 * movement, timing) and differs only in the per-species knobs the frozen engine
 * already exposes: a wider territory, a small cap, and a daytime schedule.
 *
 * Bloom v1 has no predator logic — foxes peacefully wander like every other
 * ground herbivore. Hunting/aggression/needs belong to future versions and are
 * intentionally absent here; this pack declares data only.
 */

const SPECIES_FOX = 'fox';

const FOX: SpeciesDefinition = {
  species: SPECIES_FOX,
  label: 'Fox',
  family: 'ground_herbivore',
  movementType: 'walk',
  assetId: ASSET_IDS.animal(SPECIES_FOX),
  affinities: ['meadow', 'forest'],
  homeRadius: 6,
  population: { min: 1, max: 2 },
  preferredTerrain: ['grass'],
  activityWindow: 'day',
};

const FOX_ASSETS: AssetPack = {
  id: 'bloom.fox.assets',
  assets: [
    {
      id: ASSET_IDS.animal(SPECIES_FOX),
      category: 'animal',
      // Placeholder palette only — no artwork, no animation clips. A future art
      // revision adds spritesheet/frames/animations here with no other changes.
      metadata: { body: 0xe8792b, dark: 0x7a3b12 } satisfies AnimalPalette,
    },
  ],
};

export const foxPack: ContentPack = {
  id: 'bloom.species.fox',
  version: '1.0.0',
  metadata: { displayName: 'Fox', family: 'ground_herbivore' },
  dependencies: [],

  register(): void {
    speciesRegistry.register(FOX); // species + population
    assetRegistry.registerPack(FOX_ASSETS); // asset (+ animation metadata when art ships)
    animalRegistry.register({
      species: FOX.species,
      label: FOX.label,
      affinities: FOX.affinities,
    }); // ecosystem affinity for native selection
  },

  unregister(): void {
    speciesRegistry.unregister(FOX.species);
    assetRegistry.unregister(ASSET_IDS.animal(SPECIES_FOX));
    animalRegistry.unregister(FOX.species);
  },
};
