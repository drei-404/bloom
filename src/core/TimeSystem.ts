export class TimeSystem {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private tickCount = 0;
  private lastTickTime = 0;

  constructor(
    private readonly tickIntervalMs: number,
    private readonly onTick: (tick: number, deltaMs: number) => void,
  ) {}

  start(): void {
    if (this.intervalId !== null) return;
    this.lastTickTime = Date.now();
    this.intervalId = setInterval(() => {
      const now = Date.now();
      const delta = now - this.lastTickTime;
      this.lastTickTime = now;
      this.onTick(++this.tickCount, delta);
    }, this.tickIntervalMs);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  get currentTick(): number {
    return this.tickCount;
  }

  reset(): void {
    this.stop();
    this.tickCount = 0;
  }
}
