/**
 * Common contract for every decoration (lily pads, ferns, reeds, bushes,
 * mushrooms, tall grass — later). Decorations are deterministic, seeded, and
 * persistent, with no lifecycle, no AI, and no behavior. Lighter than entities:
 * they share a single table and need no per-type system.
 */
export interface IDecoration {
  id: string;
  decorationType: string;
  tileX: number;
  tileY: number;
}
