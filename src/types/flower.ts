export type FlowerType = 'white' | 'pink' | 'yellow' | 'blue';

export interface Flower {
  id: string;
  tileX: number;
  tileY: number;
  /** Sub-tile offset from the tile center, in screen pixels. */
  offsetX: number;
  offsetY: number;
  type: FlowerType;
  createdAt: number;
}
