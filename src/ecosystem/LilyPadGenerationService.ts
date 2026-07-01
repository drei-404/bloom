import type { TileGrid } from '../types/tile';
import type { IDecoration } from '../decoration/IDecoration';
import type { WorldIdentity } from '../types/identity';
import { WorldIdentityService } from '../identity/WorldIdentityService';
import { lilypadConfig, MILESTONE_LILYPADS, DECORATION_LILYPAD } from '../config/lilypadConfig';
import { ecosystemProgression } from './EcosystemProgressionService';
import { decorationRegistry } from '../decoration/DecorationRegistry';

// Register the lily pad decoration type with the framework.
decorationRegistry.register({
  type: DECORATION_LILYPAD,
  label: 'Lily Pad',
  allowedTerrain: ['water'],
});

export interface LilyPadGenInput {
  tileGrid: TileGrid;
  decorations: IDecoration[];
  identity: WorldIdentity;
  bloomDays: number;
}

/**
 * Deterministic lily pad placement — first Decoration Framework implementation.
 *
 * Pure: same seed + pond progression → same lily pads. No SQL, no rendering, no
 * Math.random(). Gated on DAY_14_LILYPADS_UNLOCKED. Lily pads sit on water tiles
 * (their intended terrain — reservation-aware canPlace would reject pond water,
 * so we validate terrain directly).
 */
class LilyPadGeneration {
  private isUnlocked(): boolean {
    return ecosystemProgression.isUnlocked(MILESTONE_LILYPADS);
  }

  private targetCount(identity: WorldIdentity): number {
    return WorldIdentityService.rng(identity, 'lilypads-count').int(
      lilypadConfig.countMin,
      lilypadConfig.countMax,
    );
  }

  /** Seed-stable priority over all tiles. */
  private tilePriority(grid: TileGrid, identity: WorldIdentity): { col: number; row: number }[] {
    const rng = WorldIdentityService.rng(identity, 'lilypads-order');
    return rng.shuffle(grid.tiles).map(tile => ({ col: tile.col, row: tile.row }));
  }

  private isWater(grid: TileGrid, col: number, row: number): boolean {
    return grid.tiles[col * grid.size + row]?.terrainType === 'water';
  }

  /**
   * Return the full decoration set. Existing decorations are kept; lily pads are
   * appended deterministically on free water tiles up to the day's desired count.
   */
  generate(input: LilyPadGenInput): IDecoration[] {
    if (!this.isUnlocked()) return input.decorations;

    const existingPads = input.decorations.filter(d => d.decorationType === DECORATION_LILYPAD);
    const waterTiles = input.tileGrid.tiles.filter(t => t.terrainType === 'water').length;
    const target = Math.min(this.targetCount(input.identity), waterTiles);

    const elapsed = input.bloomDays - lilypadConfig.unlockBloomDay;
    const desired = Math.max(0, Math.min(target, 1 + elapsed));
    if (existingPads.length >= desired) return input.decorations;

    const taken = new Set(existingPads.map(d => `${d.tileX},${d.tileY}`));
    const priority = this.tilePriority(input.tileGrid, input.identity);
    const result = [...input.decorations];

    let index = existingPads.length;
    for (const tile of priority) {
      if (result.filter(d => d.decorationType === DECORATION_LILYPAD).length >= desired) break;
      if (!this.isWater(input.tileGrid, tile.col, tile.row)) continue;
      if (taken.has(`${tile.col},${tile.row}`)) continue;

      result.push({
        id: `lilypad-${index}`,
        decorationType: DECORATION_LILYPAD,
        tileX: tile.col,
        tileY: tile.row,
      });
      taken.add(`${tile.col},${tile.row}`);
      index++;
    }

    return result;
  }
}

export const lilyPadGeneration = new LilyPadGeneration();
