import type { IAnimal } from '../animal/IAnimal';
import type { TileOccupant } from '../entity/occupancy';
import type { WildlifeContext } from './types';
import { WorldIdentityService } from '../identity/WorldIdentityService';
import { speciesRegistry } from './species/SpeciesRegistry';
import { movementStrategyRegistry } from './movement/MovementStrategyRegistry';
import { nativeSpeciesService } from '../ecosystem/NativeSpeciesService';

/**
 * Owns population only: how many of each species should exist, and spawning to
 * reach that count. It never moves or renders animals.
 *
 * Fully data-driven: it iterates registered species configs and spawns any that
 * are discovered natives of this world, growing one per Bloom Day from the day
 * the species was discovered up to its configured max. Placement is deterministic
 * (seeded `${species}-spawn-order`) and, per config, biased toward vegetation —
 * reproducing rabbit's exact pre-migration spawns. Future species plug in with no
 * changes here. Despawn support is a future extension point.
 */
class PopulationManager {
  private desiredPopulation(species: string, max: number, bloomDays: number): number {
    const discoveredDay = nativeSpeciesService.discoveredBloomDay(species);
    if (discoveredDay === null) return 0;
    const n = bloomDays - discoveredDay + 1;
    return Math.max(0, Math.min(max, n));
  }

  private nearVegetation(x: number, y: number, vegetation: TileOccupant[], radius: number): boolean {
    return vegetation.some(v => Math.abs(v.tileX - x) <= radius && Math.abs(v.tileY - y) <= radius);
  }

  /** Spawn any missing animals. Returns the (possibly extended) animal list. */
  spawn(animals: IAnimal[], ctx: WildlifeContext): IAnimal[] {
    const result = [...animals];

    for (const config of speciesRegistry.allResolved()) {
      if (!nativeSpeciesService.isDiscovered(config.species)) continue;

      const target = this.desiredPopulation(config.species, config.population.max, ctx.bloomDays);
      const current = result.filter(a => a.species === config.species);
      if (current.length >= target) continue;

      const occupants: TileOccupant[] = [
        ...ctx.staticOccupants,
        ...result.map(a => ({ tileX: a.tileX, tileY: a.tileY })),
      ];
      const strategy = movementStrategyRegistry.get(config.movementType);
      const spawnable = strategy.spawnTiles(ctx.tileGrid, occupants);
      if (spawnable.length === 0) continue;

      // Seed-stable ordering, then bias toward vegetation if the species prefers it.
      const rng = WorldIdentityService.rng(ctx.identity, `${config.species}-spawn-order`);
      const keyed = rng.shuffle(spawnable);
      let ordered = keyed;
      if (config.behavior.spawn.preferNearVegetation) {
        const radius = config.behavior.spawn.preferRadius;
        const near = keyed.filter(t => this.nearVegetation(t.x, t.y, ctx.vegetation, radius));
        const far = keyed.filter(t => !this.nearVegetation(t.x, t.y, ctx.vegetation, radius));
        ordered = [...near, ...far];
      }

      let index = current.length;
      for (const tile of ordered) {
        if (result.filter(a => a.species === config.species).length >= target) break;
        result.push({
          id: `${config.species}-${index}`,
          species: config.species,
          tileX: tile.x,
          tileY: tile.y,
          // Home territory is fixed at the spawn tile, forever.
          homeTileX: tile.x,
          homeTileY: tile.y,
          createdAtBloomDay: ctx.bloomDays,
          state: 'idle',
          facing: 'south',
          ageDays: 0,
        });
        index++;
      }
    }

    return result;
  }
}

export const populationManager = new PopulationManager();
