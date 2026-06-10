import type { TileGrid, TileData } from '../types/tile';
import type { Flower } from '../types/flower';
import type { WorldIdentity } from '../types/identity';
import { WorldIdentityService } from '../identity/WorldIdentityService';
import {
  flowerConfig,
  FLOWER_TYPES,
  MILESTONE_FLOWERS,
  FLOWER_ALLOWED_TERRAIN,
} from '../config/flowerConfig';
import { ecosystemProgression } from './EcosystemProgressionService';
import { entityRegistry } from '../entity/EntityRegistry';
import { terrainService } from '../terrain/TerrainService';

// Register the flower entity type with the generic framework.
entityRegistry.register({ type: 'flower', label: 'Flower' });

export interface FlowerGenInput {
  tileGrid: TileGrid;
  flowers: Flower[];
  identity: WorldIdentity;
  bloomDays: number;
  /** Tiles occupied by other entities (e.g. trees) — never overlap them. */
  occupied?: Set<string>;
}

/**
 * Deterministic flower placement and type selection.
 *
 * Pure: given the same seed and grass progression it always produces the same
 * flowers. No SQL, no rendering, no Math.random(). Gated on the flowers
 * milestone. Persistence + state updates are the caller's responsibility.
 */
class FlowerGeneration {
  /** True only when DAY_4_FLOWERS_UNLOCKED has fired. */
  private isUnlocked(): boolean {
    return ecosystemProgression.isUnlocked(MILESTONE_FLOWERS);
  }

  /** Deterministic target count for this world (4–8). */
  private targetCount(identity: WorldIdentity): number {
    return WorldIdentityService.rng(identity, 'flowers-count').int(
      flowerConfig.targetMin,
      flowerConfig.targetMax,
    );
  }

  /**
   * Fixed priority over all tiles, derived from the seed. Flowers fill mature,
   * unoccupied tiles in this order — so the layout is seed-stable.
   */
  private tilePriority(grid: TileGrid, identity: WorldIdentity): TileData[] {
    const rng = WorldIdentityService.rng(identity, 'flowers-order');
    return grid.tiles
      .map(tile => ({ tile, key: rng.next() }))
      .sort((a, b) => a.key - b.key)
      .map(e => e.tile);
  }

  private isMature(tile: TileData): boolean {
    return tile.grassLevel >= flowerConfig.matureThreshold;
  }

  /** Future-proof occupancy check (rocks/ponds/trees plug in here later). */
  private isOccupied(tile: TileData, taken: Set<string>): boolean {
    return taken.has(`${tile.col},${tile.row}`);
  }

  /**
   * Compute the desired flower count for the current Bloom Day:
   * 1 at unlock, +1 per Bloom Day, capped at the world target.
   */
  private desiredCount(bloomDays: number, target: number): number {
    const elapsed = bloomDays - flowerConfig.unlockBloomDay;
    return Math.max(0, Math.min(target, 1 + elapsed));
  }

  /**
   * Return the full flower set for the current state. Existing flowers are
   * kept; new ones are appended deterministically up to the desired count.
   * Returns the same array reference semantics — caller diffs by length.
   */
  generate(input: FlowerGenInput): Flower[] {
    if (!this.isUnlocked()) return input.flowers;

    const target = this.targetCount(input.identity);
    const desired = this.desiredCount(input.bloomDays, target);
    if (input.flowers.length >= desired) return input.flowers;

    const taken = new Set(input.flowers.map(f => `${f.tileX},${f.tileY}`));
    if (input.occupied) for (const k of input.occupied) taken.add(k);
    const priority = this.tilePriority(input.tileGrid, input.identity);
    const result = [...input.flowers];

    let index = input.flowers.length;
    for (const tile of priority) {
      if (result.length >= desired) break;
      if (!this.isMature(tile)) continue;
      if (!terrainService.canPlace(input.tileGrid, tile.col, tile.row, FLOWER_ALLOWED_TERRAIN)) {
        continue;
      }
      if (this.isOccupied(tile, taken)) continue;

      const typeRng = WorldIdentityService.rng(input.identity, `flower-type-${index}`);
      const posRng = WorldIdentityService.rng(input.identity, `flower-pos-${index}`);
      const type = FLOWER_TYPES[typeRng.int(0, FLOWER_TYPES.length - 1)];
      const offsetX = posRng.range(-flowerConfig.offsetRange, flowerConfig.offsetRange);
      const offsetY = posRng.range(-flowerConfig.offsetRange, flowerConfig.offsetRange);

      result.push({
        id: `flower-${index}`,
        entityType: 'flower',
        tileX: tile.col,
        tileY: tile.row,
        offsetX,
        offsetY,
        type,
        createdAtBloomDay: input.bloomDays,
      });
      taken.add(`${tile.col},${tile.row}`);
      index++;
    }

    return result;
  }
}

export const flowerGeneration = new FlowerGeneration();
