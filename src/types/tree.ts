import type { IEntity } from '../entity/IEntity';

export type TreeStage = 'sapling' | 'young' | 'mature';
export type TreeSpecies = 'oak'; // future: 'birch' | 'pine' | 'cherry'

export interface Tree extends IEntity {
  entityType: 'tree';
  species: TreeSpecies;
  stage: TreeStage;
  /** Sub-tile offset from the tile center, in screen pixels. */
  offsetX: number;
  offsetY: number;
}
