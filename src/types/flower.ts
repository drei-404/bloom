import type { IEntity } from '../entity/IEntity';

export type FlowerType = 'white' | 'pink' | 'yellow' | 'blue';

export interface Flower extends IEntity {
  entityType: 'flower';
  /** Sub-tile offset from the tile center, in screen pixels. */
  offsetX: number;
  offsetY: number;
  type: FlowerType;
}
