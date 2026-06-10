import type { TileGrid, TileData } from '../types/tile';
import type { Tree } from '../types/tree';
import type { Flower } from '../types/flower';
import type { WorldIdentity } from '../types/identity';
import { WorldIdentityService } from '../identity/WorldIdentityService';
import {
  treeConfig,
  MILESTONE_TREES,
  treeStageForAge,
  TREE_ALLOWED_TERRAIN,
} from '../config/treeConfig';
import { ecosystemProgression } from './EcosystemProgressionService';
import { entityRegistry } from '../entity/EntityRegistry';
import { buildOccupancy, tileKey } from '../entity/occupancy';
import { terrainService } from '../terrain/TerrainService';

// Register the tree entity type with the generic framework.
entityRegistry.register({ type: 'tree', label: 'Tree' });

export interface TreeGenInput {
  tileGrid: TileGrid;
  trees: Tree[];
  flowers: Flower[];
  identity: WorldIdentity;
  bloomDays: number;
  /** Tiles occupied by other entities (e.g. rocks) — never overlap them. */
  occupied?: Set<string>;
}

/**
 * Deterministic tree placement, growth order, and lifecycle.
 *
 * Pure: same seed + grass progression → same trees. No SQL, no rendering, no
 * Math.random(). Gated on DAY_5_TREES_UNLOCKED. Trees never overlap flowers or
 * other trees (Entity Framework occupancy).
 */
class TreeGeneration {
  private isUnlocked(): boolean {
    return ecosystemProgression.isUnlocked(MILESTONE_TREES);
  }

  /** Deterministic target count for this world (7–9). */
  private targetCount(identity: WorldIdentity): number {
    return WorldIdentityService.rng(identity, 'trees-count').int(
      treeConfig.targetMin,
      treeConfig.targetMax,
    );
  }

  /** Seed-stable priority over all tiles. */
  private tilePriority(grid: TileGrid, identity: WorldIdentity): TileData[] {
    const rng = WorldIdentityService.rng(identity, 'trees-order');
    return grid.tiles
      .map(tile => ({ tile, key: rng.next() }))
      .sort((a, b) => a.key - b.key)
      .map(e => e.tile);
  }

  private isMature(tile: TileData): boolean {
    return tile.grassLevel >= treeConfig.matureThreshold;
  }

  /**
   * Desired tree count for the current Bloom Day: 1 at unlock (day 5),
   * gradually rising to the target by `targetReachedBloomDay` (day 7).
   */
  private desiredCount(bloomDays: number, target: number): number {
    if (bloomDays < treeConfig.unlockBloomDay) return 0;
    const span = treeConfig.targetReachedBloomDay - treeConfig.unlockBloomDay;
    const progress = span > 0
      ? Math.min(1, (bloomDays - treeConfig.unlockBloomDay) / span)
      : 1;
    return Math.max(1, Math.round(1 + (target - 1) * progress));
  }

  /** Advance every tree's lifecycle stage for the current Bloom Day. */
  private advanceStages(trees: Tree[], bloomDays: number): { trees: Tree[]; changed: boolean } {
    let changed = false;
    const next = trees.map(t => {
      const stage = treeStageForAge(bloomDays - t.createdAtBloomDay);
      if (stage !== t.stage) {
        changed = true;
        return { ...t, stage };
      }
      return t;
    });
    return { trees: next, changed };
  }

  /**
   * Return the full tree set for the current state plus a `changed` flag the
   * caller uses to decide whether to persist. Existing trees are kept; stages
   * advance; new trees are appended deterministically up to the desired count.
   */
  tick(input: TreeGenInput): { trees: Tree[]; changed: boolean } {
    if (!this.isUnlocked()) return { trees: input.trees, changed: false };

    // 1. Lifecycle: advance stages of existing trees.
    const advanced = this.advanceStages(input.trees, input.bloomDays);
    let changed = advanced.changed;
    const trees = advanced.trees;

    // 2. Expansion: place new trees up to the desired count.
    const target = this.targetCount(input.identity);
    const desired = this.desiredCount(input.bloomDays, target);
    if (trees.length >= desired) return { trees, changed };

    // Occupied = own trees + all flowers + any extra entities (never overlap).
    const taken = buildOccupancy([...trees, ...input.flowers]);
    if (input.occupied) for (const k of input.occupied) taken.add(k);
    const priority = this.tilePriority(input.tileGrid, input.identity);
    const result = [...trees];

    let index = trees.length;
    for (const tile of priority) {
      if (result.length >= desired) break;
      if (!this.isMature(tile)) continue;
      if (!terrainService.canPlace(input.tileGrid, tile.col, tile.row, TREE_ALLOWED_TERRAIN)) {
        continue;
      }
      if (taken.has(tileKey(tile.col, tile.row))) continue;

      const posRng = WorldIdentityService.rng(input.identity, `tree-pos-${index}`);
      const offsetX = posRng.range(-treeConfig.offsetRange, treeConfig.offsetRange);
      const offsetY = posRng.range(-treeConfig.offsetRange, treeConfig.offsetRange);

      result.push({
        id: `tree-${index}`,
        entityType: 'tree',
        tileX: tile.col,
        tileY: tile.row,
        offsetX,
        offsetY,
        species: treeConfig.defaultSpecies,
        stage: treeStageForAge(0),
        createdAtBloomDay: input.bloomDays,
      });
      taken.add(tileKey(tile.col, tile.row));
      index++;
      changed = true;
    }

    return { trees: result, changed };
  }
}

export const treeGeneration = new TreeGeneration();
