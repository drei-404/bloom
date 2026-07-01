import type { TileGrid } from '../types/tile';
import type { IAnimal } from '../animal/IAnimal';
import type { Flower } from '../types/flower';
import type { Tree } from '../types/tree';
import type { Rock } from '../types/rock';
import type { IDecoration } from '../decoration/IDecoration';
import type { WorldIdentity } from '../types/identity';
import { WorldIdentityService } from '../identity/WorldIdentityService';
import { rabbitConfig, SPECIES_RABBIT } from '../config/rabbitConfig';
import { nativeSpeciesService } from './NativeSpeciesService';
import { animalRegionService } from '../animal/AnimalRegionService';

export interface RabbitGenInput {
  tileGrid: TileGrid;
  animals: IAnimal[];
  flowers: Flower[];
  trees: Tree[];
  rocks: Rock[];
  decorations: IDecoration[];
  identity: WorldIdentity;
  bloomDays: number;
}

/**
 * Deterministic rabbit spawning. Rabbit only appears when it is a *discovered
 * native* of this world — so non-Meadow worlds (or Meadow worlds whose seed
 * didn't pick rabbit) never spawn one. Population then grows from the day it was
 * discovered; placement derives from the world seed. No Math.random().
 */
class RabbitGeneration {
  private isUnlocked(): boolean {
    return nativeSpeciesService.isDiscovered(SPECIES_RABBIT);
  }

  /**
   * Population grows one per Bloom Day from the day rabbit was discovered,
   * capped at max. Returns 0 until discovered.
   */
  private population(bloomDays: number): number {
    const discoveredDay = nativeSpeciesService.discoveredBloomDay(SPECIES_RABBIT);
    if (discoveredDay === null) return 0;
    const n = bloomDays - discoveredDay + 1;
    return Math.max(0, Math.min(rabbitConfig.maxPopulation, n));
  }

  private nearPreferred(x: number, y: number, trees: Tree[], decos: IDecoration[]): boolean {
    const r = rabbitConfig.preferRadius;
    const nearTree = trees.some(t => Math.abs(t.tileX - x) <= r && Math.abs(t.tileY - y) <= r);
    if (nearTree) return true;
    return decos.some(d => Math.abs(d.tileX - x) <= r && Math.abs(d.tileY - y) <= r);
  }

  generate(input: RabbitGenInput): IAnimal[] {
    if (!this.isUnlocked()) return input.animals;

    const rabbits = input.animals.filter(a => a.species === SPECIES_RABBIT);
    const target = this.population(input.bloomDays);
    if (rabbits.length >= target) return input.animals;

    const occupants = [
      ...input.flowers,
      ...input.trees,
      ...input.rocks,
      ...input.decorations,
      ...input.animals,
    ];
    const spawnable = animalRegionService.spawnTiles(input.tileGrid, occupants);
    if (spawnable.length === 0) return input.animals;

    // Seed-stable ordering; prefer tiles near trees / vegetation first.
    const rng = WorldIdentityService.rng(input.identity, 'rabbit-spawn-order');
    const keyed = spawnable
      .map(t => ({ t, key: rng.next() }))
      .sort((a, b) => a.key - b.key)
      .map(e => e.t);
    const near = keyed.filter(t => this.nearPreferred(t.x, t.y, input.trees, input.decorations));
    const far = keyed.filter(t => !this.nearPreferred(t.x, t.y, input.trees, input.decorations));
    const ordered = [...near, ...far];

    const result = [...input.animals];
    let index = rabbits.length;
    for (const tile of ordered) {
      if (result.filter(a => a.species === SPECIES_RABBIT).length >= target) break;
      result.push({
        id: `rabbit-${index}`,
        species: SPECIES_RABBIT,
        tileX: tile.x,
        tileY: tile.y,
        createdAtBloomDay: input.bloomDays,
        state: 'idle',
        facing: 'south',
        ageDays: 0,
      });
      index++;
    }

    return result;
  }
}

export const rabbitGeneration = new RabbitGeneration();
