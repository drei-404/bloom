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
 * ButterflyPack — the first Phase 2 flyer, and the reference implementation for
 * every future flying animal. Like the deer and rabbit packs it is added
 * entirely through the Content Pack pipeline with no engine changes: it declares
 * only data.
 *
 * All behaviour comes from the `flying` family (its FSM + timing) and the `fly`
 * MovementStrategy (travel over water/obstacles, spawn anywhere in bounds,
 * respect island bounds + home radius). This pack therefore declares no
 * behaviour, no movement, no hovering/landing/attraction — those live on the
 * shared family, exactly as intended.
 *
 * The per-species knobs the frozen engine already exposes are the only
 * differences from other flyers: a wide territory (homeRadius 8), a larger
 * population band (4–8), a daytime schedule, and grass as preferred terrain.
 */

const SPECIES_BUTTERFLY = 'butterfly';

const BUTTERFLY: SpeciesDefinition = {
  species: SPECIES_BUTTERFLY,
  label: 'Butterfly',
  family: 'flying',
  movementType: 'fly',
  assetId: ASSET_IDS.animal(SPECIES_BUTTERFLY),
  affinities: ['meadow'],
  homeRadius: 8,
  population: { min: 4, max: 8 },
  preferredTerrain: ['grass'],
  activityWindow: 'day',
};

const BUTTERFLY_ASSETS: AssetPack = {
  id: 'bloom.butterfly.assets',
  assets: [
    {
      id: ASSET_IDS.animal(SPECIES_BUTTERFLY),
      category: 'animal',
      // Real art: shared 32x32 sheet sliced into per-frame textures with
      // idle/walking/sleeping clips. Renderer stays generic (no species code).
      ...animalSprite('/assets/butterfly.png', {
        // Part 2: faster wing flap.
        ...ANIMAL_ANIMATIONS,
        idle: { frames: ['idle_0', 'idle_1'], frameDurationMs: 90, loop: true },
        walking: { frames: ['walk_0', 'walk_1', 'walk_2', 'walk_3'], frameDurationMs: 70, loop: true },
      }),
      // Placeholder palette kept as the sprite-load fallback — never a crash.
      metadata: { body: 0xf5a623, dark: 0xb5651d } satisfies AnimalPalette,
    },
  ],
};

export const butterflyPack: ContentPack = {
  id: 'bloom.species.butterfly',
  version: '1.0.0',
  metadata: { displayName: 'Butterfly', family: 'flying' },
  dependencies: [],

  register(): void {
    speciesRegistry.register(BUTTERFLY); // species + population
    assetRegistry.registerPack(BUTTERFLY_ASSETS); // asset (+ animation metadata when art ships)
    animalRegistry.register({
      species: BUTTERFLY.species,
      label: BUTTERFLY.label,
      affinities: BUTTERFLY.affinities,
    }); // ecosystem affinity for native selection
  },

  unregister(): void {
    speciesRegistry.unregister(BUTTERFLY.species);
    assetRegistry.unregister(ASSET_IDS.animal(SPECIES_BUTTERFLY));
    animalRegistry.unregister(BUTTERFLY.species);
  },
};
