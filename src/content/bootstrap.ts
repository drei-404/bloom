// Engine content registered before species packs load:
//  • movement strategies (walk / fly) for the movement families
//  • family behaviours (ground_herbivore, flying) shared by their species
//  • ecosystem affinity taxonomy for species not yet implemented (native selection)
import '../wildlife/movement/registerStrategies';
import '../wildlife/families/groundHerbivore';
import '../wildlife/families/flying';
import '../animal/speciesCatalog';

import { contentRegistry } from './ContentRegistry';
import { rabbitPack } from './packs/rabbit.pack';
import { deerPack } from './packs/deer.pack';
import { butterflyPack } from './packs/butterfly.pack';

// Every species pack registers here. Adding a species = one import + one line.
const PACKS = [rabbitPack, deerPack, butterflyPack];

let loaded = false;

/**
 * Load all of Bloom's built-in content. Call once at startup, before the world
 * engine or renderer run. Idempotent.
 */
export function loadBloomContent(): void {
  if (loaded) return;
  for (const pack of PACKS) contentRegistry.register(pack);
  contentRegistry.loadAll();
  loaded = true;
}
