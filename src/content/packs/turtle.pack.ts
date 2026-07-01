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
 * TurtlePack — a Water species added entirely through the Content Pack pipeline
 * with no engine changes. Behaviour comes from the shared `ground_herbivore`
 * family; amphibious movement comes from the `swim` MovementStrategy. Data only —
 * no basking, no diving, no custom AI. A tight territory and small population
 * band are its only per-species knobs.
 */

const SPECIES_TURTLE = 'turtle';

const TURTLE: SpeciesDefinition = {
  species: SPECIES_TURTLE,
  label: 'Turtle',
  family: 'ground_herbivore',
  movementType: 'swim',
  assetId: ASSET_IDS.animal(SPECIES_TURTLE),
  affinities: ['wetland'],
  homeRadius: 3,
  population: { min: 1, max: 2 },
  preferredTerrain: ['grass'],
  activityWindow: 'day',
};

const TURTLE_ASSETS: AssetPack = {
  id: 'bloom.turtle.assets',
  assets: [
    {
      id: ASSET_IDS.animal(SPECIES_TURTLE),
      category: 'animal',
      // Real art: shared 32x32 sheet sliced into per-frame textures with
      // idle/walking/sleeping clips. Renderer stays generic (no species code).
      ...animalSprite('/assets/turtle.png', {
        // Part 2: slow, deliberate movement.
        ...ANIMAL_ANIMATIONS,
        idle: { frames: ['idle_0', 'idle_1'], frameDurationMs: 800, loop: true },
        walking: { frames: ['walk_0', 'walk_1', 'walk_2', 'walk_3'], frameDurationMs: 300, loop: true },
      }),
      // Placeholder palette kept as the sprite-load fallback — never a crash.
      metadata: { body: 0x4a7a3a, dark: 0x2e4d24 } satisfies AnimalPalette,
    },
  ],
};

export const turtlePack: ContentPack = {
  id: 'bloom.species.turtle',
  version: '1.0.0',
  metadata: { displayName: 'Turtle', family: 'ground_herbivore' },
  dependencies: [],

  register(): void {
    speciesRegistry.register(TURTLE); // species + population
    assetRegistry.registerPack(TURTLE_ASSETS); // asset (+ animation metadata when art ships)
    animalRegistry.register({
      species: TURTLE.species,
      label: TURTLE.label,
      affinities: TURTLE.affinities,
    }); // ecosystem affinity for native selection
  },

  unregister(): void {
    speciesRegistry.unregister(TURTLE.species);
    assetRegistry.unregisterPack(TURTLE_ASSETS);
    animalRegistry.unregister(TURTLE.species);
  },
};
