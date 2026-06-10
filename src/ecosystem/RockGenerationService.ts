import type { TileGrid, TileData } from '../types/tile';
import type { Rock } from '../types/rock';
import type { Flower } from '../types/flower';
import type { Tree } from '../types/tree';
import type { WorldIdentity } from '../types/identity';
import { WorldIdentityService } from '../identity/WorldIdentityService';
import { rockConfig, ROCK_TYPES, MILESTONE_ROCKS } from '../config/rockConfig';
import { ecosystemProgression } from './EcosystemProgressionService';
import { entityRegistry } from '../entity/EntityRegistry';
import { buildOccupancy, tileKey } from '../entity/occupancy';

// Register the rock entity type with the generic framework.
entityRegistry.register({ type: 'rock', label: 'Rock' });

export interface RockGenInput {
  tileGrid: TileGrid;
  rocks: Rock[];
  flowers: Flower[];
  trees: Tree[];
  identity: WorldIdentity;
  bloomDays: number;
}

/**
 * Deterministic rock placement and type selection.
 *
 * Pure: same seed + grass progression → same rocks. No SQL, no rendering, no
 * Math.random(). Gated on DAY_9_ROCKS_UNLOCKED. Rocks never overlap flowers,
 * trees, or other rocks (Entity Framework occupancy).
 */
class RockGeneration {
  private isUnlocked(): boolean {
    return ecosystemProgression.isUnlocked(MILESTONE_ROCKS);
  }

  /** Deterministic target count for this world (2–5). */
  private targetCount(identity: WorldIdentity): number {
    return WorldIdentityService.rng(identity, 'rocks-count').int(
      rockConfig.targetMin,
      rockConfig.targetMax,
    );
  }

  /** Seed-stable priority over all tiles. */
  private tilePriority(grid: TileGrid, identity: WorldIdentity): TileData[] {
    const rng = WorldIdentityService.rng(identity, 'rocks-order');
    return grid.tiles
      .map(tile => ({ tile, key: rng.next() }))
      .sort((a, b) => a.key - b.key)
      .map(e => e.tile);
  }

  private isMature(tile: TileData): boolean {
    return tile.grassLevel >= rockConfig.matureThreshold;
  }

  /**
   * Return the full rock set for the current state. Existing rocks are kept;
   * new ones are appended deterministically up to the seed-determined target as
   * mature, unoccupied tiles become available.
   */
  generate(input: RockGenInput): Rock[] {
    if (!this.isUnlocked()) return input.rocks;

    const target = this.targetCount(input.identity);
    if (input.rocks.length >= target) return input.rocks;

    // Occupied = own rocks + all flowers + all trees (never overlap).
    const taken = buildOccupancy([...input.rocks, ...input.flowers, ...input.trees]);
    const priority = this.tilePriority(input.tileGrid, input.identity);
    const result = [...input.rocks];

    let index = input.rocks.length;
    for (const tile of priority) {
      if (result.length >= target) break;
      if (!this.isMature(tile)) continue;
      if (taken.has(tileKey(tile.col, tile.row))) continue;

      const typeRng = WorldIdentityService.rng(input.identity, `rock-type-${index}`);
      const posRng = WorldIdentityService.rng(input.identity, `rock-pos-${index}`);
      const type = ROCK_TYPES[typeRng.int(0, ROCK_TYPES.length - 1)];
      const offsetX = posRng.range(-rockConfig.offsetRange, rockConfig.offsetRange);
      const offsetY = posRng.range(-rockConfig.offsetRange, rockConfig.offsetRange);

      result.push({
        id: `rock-${index}`,
        entityType: 'rock',
        tileX: tile.col,
        tileY: tile.row,
        offsetX,
        offsetY,
        type,
        createdAtBloomDay: input.bloomDays,
      });
      taken.add(tileKey(tile.col, tile.row));
      index++;
    }

    return result;
  }
}

export const rockGeneration = new RockGeneration();
