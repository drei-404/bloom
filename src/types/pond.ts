export interface TileCoord {
  x: number;
  y: number;
}

export interface PondState {
  /** Ordered footprint; tiles reveal as water in this sequence. */
  footprint: TileCoord[];
  finalSize: number;
  revealedCount: number;
  createdAtBloomDay: number;
}
