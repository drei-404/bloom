import type { IEntity } from '../entity/IEntity';

export type RockType = 'small' | 'medium' | 'large';

export interface Rock extends IEntity {
  entityType: 'rock';
  type: RockType;
  /** Sub-tile offset from the tile center, in screen pixels. */
  offsetX: number;
  offsetY: number;
}
