import type { ActivitySnapshot } from '../types/activity';
import { eventBus } from '../core/EventBus';

export class ActivityTracker {
  private mouseCount = 0;
  private keyCount = 0;
  private lastActivityAt = Date.now();
  private idleStartAt: number | null = null;

  constructor(private readonly idleThresholdMs: number) {}

  attach(): () => void {
    const onMove = (): void => {
      this.mouseCount++;
      this.recordActivity();
    };
    const onKey = (): void => {
      this.keyCount++;
      this.recordActivity();
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('keydown', onKey, { passive: true });

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('keydown', onKey);
    };
  }

  private recordActivity(): void {
    this.lastActivityAt = Date.now();
    this.idleStartAt = null;
  }

  flush(): ActivitySnapshot {
    const now = Date.now();
    const sinceActivity = now - this.lastActivityAt;

    if (sinceActivity >= this.idleThresholdMs && this.idleStartAt === null) {
      this.idleStartAt = this.lastActivityAt + this.idleThresholdMs;
    }

    const idleMs = this.idleStartAt !== null ? Math.max(0, now - this.idleStartAt) : 0;
    const mouseEvents = this.mouseCount;
    const keyEvents = this.keyCount;
    const score = Math.min(mouseEvents * 0.1 + keyEvents * 0.5, 20);

    const snapshot: ActivitySnapshot = {
      mouseEvents,
      keyEvents,
      idleMs,
      score,
      capturedAt: now,
    };

    this.mouseCount = 0;
    this.keyCount = 0;

    eventBus.emit('activity:snapshot', snapshot);
    return snapshot;
  }
}
