export type ActivityEventType = 'mouse_move' | 'key_press' | 'idle_start' | 'idle_end';

export interface ActivitySnapshot {
  mouseEvents: number;
  keyEvents: number;
  idleMs: number;
  score: number;
  capturedAt: number;
}
