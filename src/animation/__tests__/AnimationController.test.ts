import { describe, it, expect } from 'vitest';
import { AnimationController } from '../AnimationController';
import type { AnimationClip } from '../../assets/AssetDescriptor';

const loopClip: AnimationClip = { frames: ['a', 'b', 'c'], frameDurationMs: 100, loop: true };
const onceClip: AnimationClip = { frames: ['x', 'y'], frameDurationMs: 100, loop: false };

describe('AnimationController', () => {
  it('starts on the first frame when played', () => {
    const c = new AnimationController();
    c.play('walk', loopClip);
    expect(c.animationName).toBe('walk');
    expect(c.currentFrame()).toBe('a');
    expect(c.currentFrameIndex()).toBe(0);
  });

  it('advances one frame per frame duration', () => {
    const c = new AnimationController();
    c.play('walk', loopClip);
    c.update(100);
    expect(c.currentFrame()).toBe('b');
    c.update(100);
    expect(c.currentFrame()).toBe('c');
  });

  it('loops back to the first frame', () => {
    const c = new AnimationController();
    c.play('walk', loopClip);
    c.update(300); // 3 frames → wrap to index 0
    expect(c.currentFrame()).toBe('a');
    expect(c.isFinished()).toBe(false);
  });

  it('accumulates partial deltas across updates', () => {
    const c = new AnimationController();
    c.play('walk', loopClip);
    c.update(50);
    expect(c.currentFrame()).toBe('a');
    c.update(50); // total 100 → next frame
    expect(c.currentFrame()).toBe('b');
  });

  it('jumps multiple frames for a large delta', () => {
    const c = new AnimationController();
    c.play('walk', loopClip);
    c.update(250); // 2 frames + 50ms remainder
    expect(c.currentFrame()).toBe('c');
  });

  it('holds the last frame and finishes for non-looping clips', () => {
    const c = new AnimationController();
    c.play('sleep', onceClip);
    c.update(1000);
    expect(c.currentFrame()).toBe('y');
    expect(c.isFinished()).toBe(true);
  });

  it('restarts when switching to a different animation', () => {
    const c = new AnimationController();
    c.play('walk', loopClip);
    c.update(100);
    expect(c.currentFrame()).toBe('b');
    c.play('sleep', onceClip);
    expect(c.currentFrame()).toBe('x');
    expect(c.currentFrameIndex()).toBe(0);
  });

  it('is a no-op when re-playing the same animation (unless restart)', () => {
    const c = new AnimationController();
    c.play('walk', loopClip);
    c.update(100);
    c.play('walk', loopClip); // same → keep progress
    expect(c.currentFrame()).toBe('b');
    c.play('walk', loopClip, true); // restart
    expect(c.currentFrame()).toBe('a');
  });

  it('exposes elapsed time for future interpolation', () => {
    const c = new AnimationController();
    c.play('walk', loopClip);
    c.update(120);
    c.update(30);
    expect(c.elapsedTime()).toBe(150);
  });

  it('ignores non-positive deltas and zero-duration clips', () => {
    const c = new AnimationController();
    c.play('walk', loopClip);
    c.update(0);
    c.update(-50);
    expect(c.currentFrame()).toBe('a');

    const c2 = new AnimationController();
    c2.play('bad', { frames: ['a', 'b'], frameDurationMs: 0, loop: true });
    c2.update(1000);
    expect(c2.currentFrame()).toBe('a'); // held
  });

  it('returns null frame when nothing is playing', () => {
    expect(new AnimationController().currentFrame()).toBeNull();
  });
});
