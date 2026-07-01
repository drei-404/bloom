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
 * FirefliesPack — the final Phase 1 animal, and the first night-active flyer.
 * Added entirely through the Content Pack pipeline with no engine changes.
 *
 * Fireflies reuse the `flying` family (same FSM, timing) and the `fly`
 * MovementStrategy. There is no glow, no lighting, no particles, no swarming —
 * they are simply another species that happens to be awake at night. The only
 * per-species knobs are the ones the frozen engine already exposes: a large
 * swarm-sized population band (8–15), a wide territory, a wetland affinity, and
 * a nighttime schedule. This pack declares data only.
 */

const SPECIES_FIREFLIES = 'fireflies';

const FIREFLIES: SpeciesDefinition = {
  species: SPECIES_FIREFLIES,
  label: 'Fireflies',
  family: 'flying',
  movementType: 'fly',
  assetId: ASSET_IDS.animal(SPECIES_FIREFLIES),
  affinities: ['wetland'],
  homeRadius: 7,
  population: { min: 8, max: 15 },
  preferredTerrain: ['grass'],
  activityWindow: 'night',
};

const FIREFLIES_ASSETS: AssetPack = {
  id: 'bloom.fireflies.assets',
  assets: [
    {
      id: ASSET_IDS.animal(SPECIES_FIREFLIES),
      category: 'animal',
      // Real art: shared 32x32 sheet sliced into per-frame textures with
      // idle/walking/sleeping clips. Renderer stays generic (no species code).
      ...animalSprite('/assets/fireflies.png', {
        // Part 2/6: blinking idle (idle_1 is the glow-off frame) + drifting flap.
        // Sprite frames only — no particles, no glow engine, no lighting.
        ...ANIMAL_ANIMATIONS,
        idle: { frames: ['idle_0', 'idle_0', 'idle_1'], frameDurationMs: 300, loop: true },
        walking: { frames: ['walk_0', 'walk_1', 'walk_2', 'walk_3'], frameDurationMs: 110, loop: true },
      }),
      // Placeholder palette kept as the sprite-load fallback — never a crash.
      metadata: { body: 0x4a4a4a, dark: 0xf5f0a0 } satisfies AnimalPalette,
    },
  ],
};

export const firefliesPack: ContentPack = {
  id: 'bloom.species.fireflies',
  version: '1.0.0',
  metadata: { displayName: 'Fireflies', family: 'flying' },
  dependencies: [],

  register(): void {
    speciesRegistry.register(FIREFLIES); // species + population
    assetRegistry.registerPack(FIREFLIES_ASSETS); // asset (+ animation metadata when art ships)
    animalRegistry.register({
      species: FIREFLIES.species,
      label: FIREFLIES.label,
      affinities: FIREFLIES.affinities,
    }); // ecosystem affinity for native selection
  },

  unregister(): void {
    speciesRegistry.unregister(FIREFLIES.species);
    assetRegistry.unregister(ASSET_IDS.animal(SPECIES_FIREFLIES));
    animalRegistry.unregister(FIREFLIES.species);
  },
};
