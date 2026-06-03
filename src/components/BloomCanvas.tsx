import { useEffect, useRef } from 'react';
import { useBloomStore } from '../core/store';
import { PixiRenderer } from '../renderer/PixiRenderer';
import { worldConfig } from '../config/worldConfig';
import type { IRenderer } from '../renderer/IRenderer';

const renderer: IRenderer = new PixiRenderer();

export function BloomCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const worldState = useBloomStore(s => s.worldState);

  useEffect(() => {
    if (!containerRef.current) return;
    renderer
      .init(containerRef.current, worldConfig.width, worldConfig.height)
      .catch(console.error);
    return () => renderer.destroy();
  }, []);

  useEffect(() => {
    renderer.render({
      timeOfDay: worldState.timeOfDay,
      entities: worldState.entities,
      weather: worldState.weather,
      width: worldConfig.width,
      height: worldConfig.height,
    });
  }, [worldState]);

  return (
    <div
      ref={containerRef}
      style={{ width: worldConfig.width, height: worldConfig.height, overflow: 'hidden' }}
    />
  );
}
