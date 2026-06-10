import { invoke } from '@tauri-apps/api/core';
import type { ActivitySnapshot } from '../types/activity';
import { eventBus } from '../core/EventBus';

export class ActivityTracker {
  private mouseCount = 0;
  private keyCount = 0;
  private windowFocusChanges = 0;

  constructor(_idleThresholdMs: number) {}

  attach(): () => void {
    const onMove = (): void => { this.mouseCount++; };
    const onKey = (): void => { this.keyCount++; };
    const onFocus = (): void => { this.windowFocusChanges++; };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('keydown', onKey, { passive: true });
    window.addEventListener('focus', onFocus, { passive: true });

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('focus', onFocus);
    };
  }

  async flush(): Promise<ActivitySnapshot> {
    const now = Date.now();

    // System-wide idle time from Rust (Windows: GetLastInputInfo)
    let systemIdleMs = 0;
    try {
      systemIdleMs = await invoke<number>('get_system_idle_ms');
    } catch {
      // Non-Windows or IPC unavailable: fallback to 0 (always active)
    }

    // System activity multiplier
    const systemMult =
      systemIdleMs < 5_000 ? 1.0 : systemIdleMs < 30_000 ? 0.5 : 0.1;

    const mouseEvents = this.mouseCount;
    const keyEvents = this.keyCount;
    const focusChanges = this.windowFocusChanges;

    // Base score from local + system activity
    const localScore = mouseEvents * 0.1 + keyEvents * 0.5 + focusChanges * 1.0;
    const score = Math.min(localScore * systemMult + (systemIdleMs < 5_000 ? 1.5 : 0), 20);

    const snapshot: ActivitySnapshot = {
      mouseEvents,
      keyEvents,
      idleMs: systemIdleMs,
      score,
      capturedAt: now,
    };

    this.mouseCount = 0;
    this.keyCount = 0;
    this.windowFocusChanges = 0;

    eventBus.emit('activity:snapshot', snapshot);
    return snapshot;
  }
}
