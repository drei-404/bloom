import { describe, it, expect, beforeEach } from 'vitest';
import { contentRegistry } from '../ContentRegistry';
import type { ContentPack } from '../ContentPack';

const log: string[] = [];

function pack(id: string, dependencies: string[] = []): ContentPack {
  return {
    id,
    version: '1.0.0',
    dependencies,
    register: () => log.push(`reg:${id}`),
    unregister: () => log.push(`unreg:${id}`),
  };
}

describe('ContentRegistry', () => {
  beforeEach(() => {
    contentRegistry.clear();
    log.length = 0;
  });

  it('loads a pack and marks it loaded', () => {
    contentRegistry.register(pack('a'));
    contentRegistry.loadAll();
    expect(log).toEqual(['reg:a']);
    expect(contentRegistry.isLoaded('a')).toBe(true);
    expect(contentRegistry.loaded()).toEqual(['a']);
  });

  it('loads dependencies before dependents', () => {
    contentRegistry.register(pack('app', ['engine']));
    contentRegistry.register(pack('engine'));
    contentRegistry.loadAll();
    expect(log).toEqual(['reg:engine', 'reg:app']);
  });

  it('is idempotent — a pack registers exactly once', () => {
    contentRegistry.register(pack('a'));
    contentRegistry.load('a');
    contentRegistry.load('a');
    contentRegistry.loadAll();
    expect(log).toEqual(['reg:a']);
  });

  it('throws on an unregistered dependency', () => {
    contentRegistry.register(pack('a', ['missing']));
    expect(() => contentRegistry.loadAll()).toThrow(/unregistered pack "missing"/);
  });

  it('throws on a circular dependency', () => {
    contentRegistry.register(pack('a', ['b']));
    contentRegistry.register(pack('b', ['a']));
    expect(() => contentRegistry.loadAll()).toThrow(/circular/);
  });

  it('throws when loading an unknown pack', () => {
    expect(() => contentRegistry.load('nope')).toThrow(/unknown content pack/);
  });

  it('unloads a pack, running its unregister', () => {
    contentRegistry.register(pack('a'));
    contentRegistry.loadAll();
    contentRegistry.unload('a');
    expect(log).toEqual(['reg:a', 'unreg:a']);
    expect(contentRegistry.isLoaded('a')).toBe(false);
  });

  it('unloading an unloaded pack is a no-op', () => {
    contentRegistry.register(pack('a'));
    contentRegistry.unload('a');
    expect(log).toEqual([]);
  });
});
