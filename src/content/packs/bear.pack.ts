import type { ContentPack } from '../ContentPack';
import type { SpeciesDefinition } from '../../wildlife/types';
import type { AssetPack } from '../../assets/AssetDescriptor';
import type { AnimalPalette } from '../../assets/placeholderPack';
import { ASSET_IDS } from '../../assets/placeholderPack';
import { animalSprite, ANIMAL_ANIMATIONS } from '../../assets/animalSprite';
import { speciesRegistry } from '../../wildlife/species/SpeciesRegistry';
import { assetRegistry } from '../../assets/AssetRegistry';
import { animalRegistry } from '../../animal/AnimalRegistry';

/**
 * BearPack — the largest land mammal, added entirely through the Content Pack
 * pipeline with no engine changes. Bear reuses the `ground_herbivore` family
 * (same FSM, movement, timing) and differs only in the per-species knobs the
 * frozen engine already exposes: the widest territory, a lone cap (max 1), a
 * forest-only affinity, and a daytime schedule.
 *
 * Bloom v1 has no predator/combat logic — bears peacefully wander like every
 * other ground herbivore. Aggression/needs belong to future versions and are
 * intentionally absent; this pack declares data only.
 */

const SPECIES_BEAR = 'bear';

const BEAR: SpeciesDefinition = {
  species: SPECIES_BEAR,
  label: 'Bear',
  family: 'ground_herbivore',
  movementType: 'walk',
  assetId: ASSET_IDS.animal(SPECIES_BEAR),
  affinities: ['forest'],
  homeRadius: 8,
  population: { min: 1, max: 1 },
  preferredTerrain: ['grass'],
  activityWindow: 'day',
};

const BEAR_ASSETS: AssetPack = {
  id: 'bloom.bear.assets',
  assets: [
    {
      id: ASSET_IDS.animal(SPECIES_BEAR),
      category: 'animal',
      // Real art: shared 32x32 sheet sliced into per-frame textures with
      // idle/walking/sleeping clips. Renderer stays generic (no species code).
      ...animalSprite('/assets/bear.png', {
        // Part 2: slower, heavier gait.
        ...ANIMAL_ANIMATIONS,
        idle: { frames: ['idle_0', 'idle_1'], frameDurationMs: 750, loop: true },
        walking: { frames: ['walk_0', 'walk_1', 'walk_2', 'walk_3'], frameDurationMs: 240, loop: true },
      }),
      // Placeholder palette kept as the sprite-load fallback — never a crash.
      metadata: { body: 0x5c3a21, dark: 0x2e1c10 } satisfies AnimalPalette,
    },
  ],
};

export const bearPack: ContentPack = {
  id: 'bloom.species.bear',
  version: '1.0.0',
  metadata: { displayName: 'Bear', family: 'ground_herbivore' },
  dependencies: [],

  register(): void {
    speciesRegistry.register(BEAR); // species + population
    assetRegistry.registerPack(BEAR_ASSETS); // asset (+ animation metadata when art ships)
    animalRegistry.register({
      species: BEAR.species,
      label: BEAR.label,
      affinities: BEAR.affinities,
    }); // ecosystem affinity for native selection
  },

  unregister(): void {
    speciesRegistry.unregister(BEAR.species);
    assetRegistry.unregister(ASSET_IDS.animal(SPECIES_BEAR));
    animalRegistry.unregister(BEAR.species);
  },
};
