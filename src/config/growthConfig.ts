export const growthConfig = {
  baseRate: 0.00015,
  spreadFactor: 3.0,
  nightMultiplier: 0.3,
  activityScoreToMult: (score: number): number => 0.3 + score * 0.035,
  seedTiles: [
    { col: 5, row: 5 },
    { col: 4, row: 5 },
    { col: 5, row: 4 },
  ],
} as const;
