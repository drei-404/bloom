export interface VegetationTypeConfig {
  type: string;
  label: string;
  milestone: string;
  countMin: number;
  countMax: number;
  /** Fern prefers tiles within this many steps of a tree (0 = no bias). */
  nearTreeRadius: number;
}

export const vegetationTypes: VegetationTypeConfig[] = [
  {
    type: 'fern',
    label: 'Fern',
    milestone: 'DAY_10_FERNS_UNLOCKED',
    countMin: 3,
    countMax: 5,
    nearTreeRadius: 2,
  },
  {
    type: 'bush',
    label: 'Bush',
    milestone: 'DAY_11_BUSHES_UNLOCKED',
    countMin: 2,
    countMax: 4,
    nearTreeRadius: 0,
  },
  {
    type: 'tall_grass',
    label: 'Tall Grass',
    milestone: 'DAY_12_TALL_GRASS_UNLOCKED',
    countMin: 6,
    countMax: 10,
    nearTreeRadius: 0,
  },
];

/** Grass level a tile must reach before vegetation may spawn (mature/lush). */
export const VEGETATION_MATURE_THRESHOLD = 0.8;
