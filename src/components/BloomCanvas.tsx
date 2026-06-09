import { useEffect } from 'react';
import { useBloomStore } from '../core/store';
import { PixiRenderer } from '../renderer/PixiRenderer';
import { islandConfig } from '../config/islandConfig';
import type { IRenderer } from '../renderer/IRenderer';

export const rendererInstance: IRenderer = new PixiRenderer();
let containerEl: HTMLDivElement | null = null;

export function BloomCanvas() {
  const worldState = useBloomStore(s => s.worldState);
  const flowers = useBloomStore(s => s.flowers);

  useEffect(() => {
    if (!containerEl) return;
    rendererInstance
      .init(containerEl, islandConfig.canvas.width, islandConfig.canvas.height)
      .catch(console.error);
    return () => rendererInstance.destroy();
  }, []);

  useEffect(() => {
    rendererInstance.render({
      timeOfDay: worldState.timeOfDay,
      tileGrid: worldState.tileGrid,
      flowers,
      width: islandConfig.canvas.width,
      height: islandConfig.canvas.height,
    });
  }, [worldState, flowers]);

  return (
    <div
      ref={el => { containerEl = el; }}
      style={{
        width: islandConfig.canvas.width,
        height: islandConfig.canvas.height,

        background: 'transparent',
      }}
    />
  );
}
