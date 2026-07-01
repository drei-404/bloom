import type { ContentPack } from '../ContentPack';
import type { SpeciesDefinition } from '../../wildlife/types';
import type { AssetPack } from '../../assets/AssetDescriptor';
import type { AnimalPalette } from '../../assets/placeholderPack';
import { SPECIES_RABBIT } from '../../config/rabbitConfig';
import { ASSET_IDS } from '../../assets/placeholderPack';
import { speciesRegistry } from '../../wildlife/species/SpeciesRegistry';
import { assetRegistry } from '../../assets/AssetRegistry';
import { animalRegistry } from '../../animal/AnimalRegistry';

/**
 * RabbitPack — the reference Content Pack. Everything rabbit-specific lives here:
 * its species definition (identity + population), its asset (spritesheet +
 * frame definitions + animation clips, with a placeholder palette kept as the
 * load-failure fallback), and its ecosystem affinity. Behaviour comes from the
 * `ground_herbivore` family (engine content,
 * a dependency), so this pack declares no behaviour.
 *
 * Values are rabbit's pre-pack config verbatim → gameplay is identical. Adding a
 * new species = copying this file and changing the data.
 */

const RABBIT: SpeciesDefinition = {
  species: SPECIES_RABBIT,
  label: 'Rabbit',
  family: 'ground_herbivore',
  movementType: 'walk',
  assetId: ASSET_IDS.animal(SPECIES_RABBIT),
  affinities: ['meadow'],
  homeRadius: 3,
  population: { min: 1, max: 3 },
  preferredTerrain: ['grass'],
  activityWindow: 'always',
};

// Production art. The spritesheet is a 32x32-per-frame horizontal strip authored
// by scripts/gen-rabbit-sheet.mjs. Frame order below MUST match that script.
const FRAME = 32;
const FRAME_ORDER = ['idle_0', 'idle_1', 'walk_0', 'walk_1', 'walk_2', 'walk_3', 'sleep_0'];

/** Slice the strip into `frameId → pixel rect` by column index. */
const RABBIT_FRAMES = Object.fromEntries(
  FRAME_ORDER.map((id, i) => [id, { x: i * FRAME, y: 0, w: FRAME, h: FRAME }]),
);

const RABBIT_ASSETS: AssetPack = {
  id: 'bloom.rabbit.assets',
  assets: [
    {
      id: ASSET_IDS.animal(SPECIES_RABBIT),
      category: 'animal',
      // Real art: a hand-authored sheet sliced into per-frame textures. The clip
      // ids are the AnimalState values the FSM emits (idle/walking/sleeping), so
      // the generic renderer resolves them with no rabbit-specific code.
      spritesheet: '/assets/rabbit.png',
      frames: RABBIT_FRAMES,
      // Drawn when not animating, and the fallback frame for any un-clipped state.
      staticFrame: 'idle_0',
      animations: {
        idle: { frames: ['idle_0', 'idle_1'], frameDurationMs: 500, loop: true },
        walking: { frames: ['walk_0', 'walk_1', 'walk_2', 'walk_3'], frameDurationMs: 120, loop: true },
        sleeping: { frames: ['sleep_0'], frameDurationMs: 0, loop: false },
      },
      // Placeholder palette retained: if the sheet fails to load, the renderer
      // draws the primitive rabbit from this metadata — never a crash.
      metadata: { body: 0xd8cfc0, dark: 0xb8ae9c } satisfies AnimalPalette,
    },
  ],
};

export const rabbitPack: ContentPack = {
  id: 'bloom.species.rabbit',
  version: '1.0.0',
  metadata: { displayName: 'Rabbit', family: 'ground_herbivore' },
  // The ground_herbivore family is engine content registered before packs load.
  dependencies: [],

  register(): void {
    // registerSpecies (+ population, which lives in the definition)
    speciesRegistry.register(RABBIT);
    // registerAssets: spritesheet + frames + animation clips + placeholder palette.
    // Textures load later via assetRegistry.preloadAll() at renderer startup.
    assetRegistry.registerPack(RABBIT_ASSETS);
    // register ecosystem affinity so worlds can discover rabbit as a native
    animalRegistry.register({
      species: RABBIT.species,
      label: RABBIT.label,
      affinities: RABBIT.affinities,
    });
  },

  unregister(): void {
    speciesRegistry.unregister(RABBIT.species);
    assetRegistry.unregister(ASSET_IDS.animal(SPECIES_RABBIT));
    animalRegistry.unregister(RABBIT.species);
  },
};
