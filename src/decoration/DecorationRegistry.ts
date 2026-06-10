import type { TileGrid, TerrainType } from '../types/tile';
import { terrainService } from '../terrain/TerrainService';

export interface DecorationTypeDescriptor {
  type: string;
  label: string;
  /** Terrain this decoration may sit on (fern → grass, lily pad → water). */
  allowedTerrain: TerrainType[];
}

/**
 * Registry of decoration types. Open for extension, closed for modification:
 * future decorations self-register at module init without touching existing
 * entries. Carries each type's terrain requirement for placement validation.
 */
class DecorationRegistry {
  private readonly types = new Map<string, DecorationTypeDescriptor>();

  /** Register a decoration type. No-op if the type is already registered. */
  register(descriptor: DecorationTypeDescriptor): void {
    if (this.types.has(descriptor.type)) return;
    this.types.set(descriptor.type, descriptor);
  }

  get(type: string): DecorationTypeDescriptor | undefined {
    return this.types.get(type);
  }

  has(type: string): boolean {
    return this.types.has(type);
  }

  all(): DecorationTypeDescriptor[] {
    return [...this.types.values()];
  }

  allowedTerrain(type: string): TerrainType[] {
    return this.types.get(type)?.allowedTerrain ?? [];
  }

  /** Whether a decoration of `type` may be placed on (x, y). */
  canPlace(grid: TileGrid, x: number, y: number, type: string): boolean {
    const descriptor = this.types.get(type);
    if (!descriptor) return false;
    return terrainService.canPlace(grid, x, y, descriptor.allowedTerrain);
  }
}

export const decorationRegistry = new DecorationRegistry();
