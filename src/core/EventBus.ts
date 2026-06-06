import type { ActivitySnapshot } from '../types/activity';
import type { WorldState } from '../types/world';

export interface EventMap {
  'activity:snapshot': ActivitySnapshot;
  'world:day_changed': { day: number };
  'world:bloom_day_changed': { bloomDay: number };
  'world:loaded': WorldState;
  'world:save_requested': undefined;
  'settings:changed': { key: string; value: unknown };
}

type Handler<T> = (payload: T) => void;

class TypedEventBus {
  private readonly listeners = new Map<string, Set<Handler<unknown>>>();

  on<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as Handler<unknown>);
    return () => this.off(event, handler);
  }

  off<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): void {
    this.listeners.get(event)?.delete(handler as Handler<unknown>);
  }

  emit<K extends keyof EventMap>(
    ...[event, payload]: EventMap[K] extends undefined ? [K] : [K, EventMap[K]]
  ): void {
    this.listeners.get(event)?.forEach(h => h(payload as unknown));
  }
}

export const eventBus = new TypedEventBus();
