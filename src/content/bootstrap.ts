// Engine content registered before species packs load:
//  • ground_herbivore family behaviour (shared by grazing land species)
//  • ecosystem affinity taxonomy for species not yet implemented (native selection)
import '../wildlife/families/groundHerbivore';
import '../animal/speciesCatalog';

import { contentRegistry } from './ContentRegistry';
import { rabbitPack } from './packs/rabbit.pack';

// Every species pack registers here. Adding a species = one import + one line.
const PACKS = [rabbitPack];

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
