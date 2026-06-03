import type { RenderState } from '../types/renderer';

export interface IRenderer {
  init(container: HTMLElement, width: number, height: number): Promise<void>;
  render(state: RenderState): void;
  resize(width: number, height: number): void;
  destroy(): void;
}
