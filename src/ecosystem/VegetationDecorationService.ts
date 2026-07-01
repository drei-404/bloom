import type { TileGrid, TileData } from '../types/tile';
import type { IDecoration } from '../decoration/IDecoration';
import type { Flower } from '../types/flower';
import type { Tree } from '../types/tree';
import type { Rock } from '../types/rock';
import type { WorldIdentity } from '../types/identity';
import { WorldIdentityService } from '../identity/WorldIdentityService';
import {
  vegetationTypes,
  VEGETATION_MATURE_THRESHOLD,
  type VegetationTypeConfig,
} from '../config/vegetationConfig';
import { ecosystemProgression } from './EcosystemProgressionService';
import { decorationRegistry } from '../decoration/DecorationRegistry';
import { buildOccupancy, tileKey } from '../entity/occupancy';

// Register all vegetation decoration types (grass-only).
for (const v of vegetationTypes) {
  decorationRegistry.register({ type: v.type, label: v.label, allowedTerrain: ['grass'] });
}

export interface VegetationGenInput {
  tileGrid: TileGrid;
  decorations: IDecoration[];
  flowers: Flower[];
  trees: Tree[];
  rocks: Rock[];
  identity: WorldIdentity;
  bloomDays: number;
}

/**
 * Deterministic vegetation decorations (fern, bush, tall grass).
 *
 * Pure: same seed + grass progression → same vegetation. No SQL, no rendering,
 * no Math.random(). Each type gated on its milestone. Grass only; never
 * overlaps entities or other decorations.
 */
class VegetationDecoration {
  private isMature(tile: TileData): boolean {
    return tile.grassLevel >= VEGETATION_MATURE_THRESHOLD;
  }

  private targetCount(identity: WorldIdentity, cfg: VegetationTypeConfig): number {
    return WorldIdentityService.rng(identity, `${cfg.type}-count`).int(
      cfg.countMin,
      cfg.countMax,
    );
  }

  /** Seed-stable priority over all tiles for this type. */
  private tilePriority(grid: TileGrid, identity: WorldIdentity, type: string): TileData[] {
    const rng = WorldIdentityService.rng(identity, `${type}-order`);
    return rng.shuffle(grid.tiles);
  }

  private nearAnyTree(tile: TileData, trees: Tree[], radius: number): boolean {
    return trees.some(
      t => Math.abs(t.tileX - tile.col) <= radius && Math.abs(t.tileY - tile.row) <= radius,
    );
  }

  /** One placement pass for a vegetation type. Returns appended decorations. */
  private placeType(
    cfg: VegetationTypeConfig,
    input: VegetationGenInput,
    decorations: IDecoration[],
    occupied: Set<string>,
  ): IDecoration[] {
    if (!ecosystemProgression.isUnlocked(cfg.milestone)) return decorations;

    const existing = decorations.filter(d => d.decorationType === cfg.type);
    const target = this.targetCount(input.identity, cfg);
    if (existing.length >= target) return decorations;

    // Order tiles; fern prefers near-tree tiles first (still deterministic).
    let priority = this.tilePriority(input.tileGrid, input.identity, cfg.type);
    if (cfg.nearTreeRadius > 0) {
      const near = priority.filter(t => this.nearAnyTree(t, input.trees, cfg.nearTreeRadius));
      const far = priority.filter(t => !this.nearAnyTree(t, input.trees, cfg.nearTreeRadius));
      priority = [...near, ...far];
    }

    const result = [...decorations];
    let count = existing.length;
    let index = existing.length;

    for (const tile of priority) {
      if (count >= target) break;
      if (!this.isMature(tile)) continue;
      if (!decorationRegistry.canPlace(input.tileGrid, tile.col, tile.row, cfg.type)) continue;
      if (occupied.has(tileKey(tile.col, tile.row))) continue;

      result.push({
        id: `${cfg.type}-${index}`,
        decorationType: cfg.type,
        tileX: tile.col,
        tileY: tile.row,
      });
      occupied.add(tileKey(tile.col, tile.row));
      count++;
      index++;
    }

    return result;
  }

  /**
   * Run all vegetation passes. Occupancy accumulates across types so no two
   * decorations (or a decoration and an entity) share a tile.
   */
  generate(input: VegetationGenInput): IDecoration[] {
    let decorations = input.decorations;
    const occupied = buildOccupancy([
      ...input.flowers,
      ...input.trees,
      ...input.rocks,
      ...input.decorations,
    ]);

    for (const cfg of vegetationTypes) {
      decorations = this.placeType(cfg, input, decorations, occupied);
    }
    return decorations;
  }
}

export const vegetationDecoration = new VegetationDecoration();
