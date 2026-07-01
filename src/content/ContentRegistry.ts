import type { ContentPack } from './ContentPack';

/**
 * Loads content packs at startup. Packs are registered, then loaded in
 * dependency order (a pack's `dependencies` load before it). Loading a pack runs
 * its `register()`; unloading runs its `unregister()`. The app calls `loadAll()`
 * once — no manual registry edits per species.
 *
 * Not a plugin loader: no downloading, networking, or hot reload. Purely an
 * ordered, dependency-aware registration step over in-process packs.
 */
class ContentRegistry {
  private readonly packs = new Map<string, ContentPack>();
  private readonly loadedIds = new Set<string>();

  register(pack: ContentPack): void {
    this.packs.set(pack.id, pack);
  }

  isRegistered(id: string): boolean {
    return this.packs.has(id);
  }

  isLoaded(id: string): boolean {
    return this.loadedIds.has(id);
  }

  loaded(): string[] {
    return [...this.loadedIds];
  }

  /** Load one pack (and its dependencies first). Idempotent. */
  load(id: string, stack: Set<string> = new Set()): void {
    if (this.loadedIds.has(id)) return;
    const pack = this.packs.get(id);
    if (!pack) throw new Error(`unknown content pack: "${id}"`);
    if (stack.has(id)) throw new Error(`circular content dependency at "${id}"`);

    stack.add(id);
    for (const dep of pack.dependencies ?? []) {
      if (!this.packs.has(dep)) {
        throw new Error(`content pack "${id}" depends on unregistered pack "${dep}"`);
      }
      this.load(dep, stack);
    }
    stack.delete(id);

    pack.register();
    this.loadedIds.add(id);
  }

  /** Load every registered pack, dependencies first. */
  loadAll(): void {
    for (const id of this.packs.keys()) this.load(id);
  }

  /** Unload a pack (runs its `unregister`). Dependents are not cascaded. */
  unload(id: string): void {
    if (!this.loadedIds.has(id)) return;
    this.packs.get(id)?.unregister();
    this.loadedIds.delete(id);
  }

  /** Test/reset hook. */
  clear(): void {
    this.packs.clear();
    this.loadedIds.clear();
  }
}

export const contentRegistry = new ContentRegistry();
