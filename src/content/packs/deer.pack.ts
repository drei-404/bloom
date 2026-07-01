import type { ContentPack } from '../ContentPack';
import type { SpeciesDefinition } from '../../wildlife/types';
import type { AssetPack } from '../../assets/AssetDescriptor';
import type { AnimalPalette } from '../../assets/placeholderPack';
import { ASSET_IDS } from '../../assets/placeholderPack';
import { speciesRegistry } from '../../wildlife/species/SpeciesRegistry';
import { assetRegistry } from '../../assets/AssetRegistry';
import { animalRegistry } from '../../animal/AnimalRegistry';

/**
 * DeerPack — first Phase 2 species, added entirely through the Content Pack
 * pipeline with no engine changes. Deer reuse the `ground_herbivore` family
 * (same FSM, movement, timing) and differ only in the per-species knobs the
 * frozen engine already exposes: a larger territory, a smaller cap, and a
 * daytime schedule.
 *
 * Note on the recommended "lower rest chance / longer walk": those are
 * FamilyBehavior values (shared by every ground herbivore), not per-species
 * config. The frozen engine exposes no per-species behaviour override, and
 * adding one would be an engine change — out of scope. Deer therefore inherit
 * the family's rest/walk timing unchanged; `activityWindow: 'day'` provides the
 * real, config-only behavioural difference (deer sleep at night; rabbits don't).
 */

const SPECIES_DEER = 'deer';

const DEER: SpeciesDefinition = {
  species: SPECIES_DEER,
  label: 'Deer',
  family: 'ground_herbivore',
  movementType: 'walk',
  assetId: ASSET_IDS.animal(SPECIES_DEER),
  affinities: ['meadow', 'forest'],
  homeRadius: 6,
  population: { min: 1, max: 2 },
  preferredTerrain: ['grass'],
  activityWindow: 'day',
};

const DEER_ASSETS: AssetPack = {
  id: 'bloom.deer.assets',
  assets: [
    {
      id: ASSET_IDS.animal(SPECIES_DEER),
      category: 'animal',
      // Placeholder palette only — no artwork, no animation clips. A future art
      // revision adds spritesheet/frames/animations here with no other changes.
      metadata: { body: 0x9c7a4e, dark: 0x6b4a2a } satisfies AnimalPalette,
    },
  ],
};

export const deerPack: ContentPack = {
  id: 'bloom.species.deer',
  version: '1.0.0',
  metadata: { displayName: 'Deer', family: 'ground_herbivore' },
  dependencies: [],

  register(): void {
    speciesRegistry.register(DEER); // species + population
    assetRegistry.registerPack(DEER_ASSETS); // asset (+ animation metadata when art ships)
    animalRegistry.register({
      species: DEER.species,
      label: DEER.label,
      affinities: DEER.affinities,
    }); // ecosystem affinity for native selection
  },

  unregister(): void {
    speciesRegistry.unregister(DEER.species);
    assetRegistry.unregister(ASSET_IDS.animal(SPECIES_DEER));
    animalRegistry.unregister(DEER.species);
  },
};
