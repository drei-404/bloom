export interface WorldClock {
  /** Runtime minutes accumulated while Bloom is running. */
  runtimeMinutes: number;
  /** Runtime hours accumulated while Bloom is running. */
  runtimeHours: number;
  /** Completed Bloom Days (1 Bloom Day = 24 runtime hours). 0-based count. */
  bloomDays: number;
}
