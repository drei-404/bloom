import type { AnimationClip } from '../assets/AssetDescriptor';

/**
 * Reusable, asset-agnostic animation playback state. One controller drives one
 * animated instance (an animal, a decoration, a weather effect, a UI element —
 * it does not know or care which). It owns all animation state and timing; the
 * renderer only feeds it elapsed time and asks for the current frame.
 *
 * Deterministic given the same sequence of `update(delta)` calls. No rendering,
 * no simulation, no asset loading — pure playback.
 */
export class AnimationController {
  private clip: AnimationClip | null = null;
  private name: string | null = null;
  private frameIndex = 0;
  private frameElapsedMs = 0;
  private totalElapsedMs = 0;
  private finished = false;

  /** The id of the animation currently playing, or null if none. */
  get animationName(): string | null {
    return this.name;
  }

  /**
   * Play an animation. Switching to a different animation restarts from frame 0;
   * re-playing the same one is a no-op unless `restart` is set. The renderer maps
   * a simulation/asset state to a clip id and calls this each frame.
   */
  play(name: string, clip: AnimationClip, restart = false): void {
    if (this.name === name && !restart) return;
    this.name = name;
    this.clip = clip;
    this.frameIndex = 0;
    this.frameElapsedMs = 0;
    this.totalElapsedMs = 0;
    this.finished = false;
  }

  /** Advance playback by `deltaMs`. Owns all frame timing + looping logic. */
  update(deltaMs: number): void {
    const clip = this.clip;
    if (!clip || clip.frames.length === 0 || deltaMs <= 0) return;
    if (clip.frameDurationMs <= 0) return; // static / malformed → hold frame 0
    if (this.finished) {
      this.totalElapsedMs += deltaMs;
      return;
    }

    this.frameElapsedMs += deltaMs;
    this.totalElapsedMs += deltaMs;

    while (this.frameElapsedMs >= clip.frameDurationMs) {
      this.frameElapsedMs -= clip.frameDurationMs;
      this.frameIndex += 1;
      if (this.frameIndex >= clip.frames.length) {
        if (clip.loop) {
          this.frameIndex %= clip.frames.length;
        } else {
          this.frameIndex = clip.frames.length - 1;
          this.finished = true;
          this.frameElapsedMs = 0;
          break;
        }
      }
    }
  }

  /** The current frame id, or null if no animation is playing. */
  currentFrame(): string | null {
    if (!this.clip || this.clip.frames.length === 0) return null;
    return this.clip.frames[this.frameIndex];
  }

  currentFrameIndex(): number {
    return this.frameIndex;
  }

  /**
   * Total elapsed time in the current animation (ms). Exposed so smooth-movement
   * interpolation can be layered on later without redesign — not used yet.
   */
  elapsedTime(): number {
    return this.totalElapsedMs;
  }

  /** True once a non-looping animation has reached and held its last frame. */
  isFinished(): boolean {
    return this.finished;
  }

  reset(): void {
    this.frameIndex = 0;
    this.frameElapsedMs = 0;
    this.totalElapsedMs = 0;
    this.finished = false;
  }
}
