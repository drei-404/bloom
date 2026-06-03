import { Application, Container, Graphics } from 'pixi.js';
import type { IRenderer } from './IRenderer';
import type { RenderState } from '../types/renderer';
import type { EntityInstance, EntityType, EntityState } from '../types/entity';

type ColorMap = Record<EntityState, number>;
type SizeMap = Record<EntityState, number>;

const ENTITY_COLORS: Record<EntityType, ColorMap> = {
  grass: { seedling: 0x90EE90, growing: 0x32CD32, mature: 0x006400 },
  flower: { seedling: 0xFFB6C1, growing: 0xFF69B4, mature: 0xDC143C },
  tree: { seedling: 0xADFF2F, growing: 0x228B22, mature: 0x1A5C1A },
};

const ENTITY_SIZES: Record<EntityType, SizeMap> = {
  grass: { seedling: 6, growing: 10, mature: 14 },
  flower: { seedling: 8, growing: 14, mature: 20 },
  tree: { seedling: 14, growing: 24, mature: 36 },
};

const SKY_STOPS: Array<[number, number]> = [
  [0.0, 0x1A0040],
  [0.2, 0xFF6B35],
  [0.35, 0x87CEEB],
  [0.5, 0x5DADE2],
  [0.65, 0x87CEEB],
  [0.8, 0xFF6B35],
  [1.0, 0x1A0040],
];

export class PixiRenderer implements IRenderer {
  private app!: Application;
  private skyLayer!: Container;
  private cloudLayer!: Container;
  private groundLayer!: Container;
  private entityLayer!: Container;
  private skyGraphic!: Graphics;
  private clouds: Graphics[] = [];
  private entityGraphics = new Map<string, Graphics>();
  private entityStateCache = new Map<string, EntityState>();
  private canvasWidth = 0;
  private ready = false;

  async init(container: HTMLElement, width: number, height: number): Promise<void> {
    if (this.ready) this.destroy();

    this.canvasWidth = width;

    this.app = new Application();
    await this.app.init({
      width,
      height,
      background: 0x87CEEB,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    container.appendChild(this.app.canvas);

    this.skyLayer = new Container();
    this.cloudLayer = new Container();
    this.groundLayer = new Container();
    this.entityLayer = new Container();

    this.app.stage.addChild(this.skyLayer);
    this.app.stage.addChild(this.cloudLayer);
    this.app.stage.addChild(this.groundLayer);
    this.app.stage.addChild(this.entityLayer);

    this.skyGraphic = new Graphics();
    this.skyLayer.addChild(this.skyGraphic);

    this.buildGround(width, height);
    this.buildClouds(width, height);
    this.startCloudDrift();
    this.drawSky(0.5, width, height);

    this.ready = true;
  }

  private buildGround(width: number, height: number): void {
    const groundY = height * 0.667;
    const g = new Graphics();
    g.rect(0, groundY, width, height - groundY).fill(0x7C6A44);
    this.groundLayer.addChild(g);
  }

  private buildClouds(width: number, height: number): void {
    this.clouds = [];
    for (let i = 0; i < 8; i++) {
      const cloud = new Graphics();
      const hw = 25 + Math.random() * 35;
      const hh = 8 + Math.random() * 10;
      cloud.ellipse(0, 0, hw, hh).fill(0xFFFFFF);
      cloud.position.set(Math.random() * width, 25 + Math.random() * height * 0.22);
      cloud.alpha = 0;
      this.cloudLayer.addChild(cloud);
      this.clouds.push(cloud);
    }
  }

  private startCloudDrift(): void {
    this.app.ticker.add(() => {
      for (const cloud of this.clouds) {
        cloud.x += 0.25;
        if (cloud.x > this.canvasWidth + 80) {
          cloud.x = -80;
        }
      }
    });
  }

  private drawSky(timeOfDay: number, width: number, height: number): void {
    const color = this.lerpSkyColor(timeOfDay);
    this.skyGraphic.clear();
    this.skyGraphic.rect(0, 0, width, height * 0.667).fill(color);
  }

  private lerpSkyColor(t: number): number {
    for (let i = 0; i < SKY_STOPS.length - 1; i++) {
      const [t0, c0] = SKY_STOPS[i];
      const [t1, c1] = SKY_STOPS[i + 1];
      if (t >= t0 && t <= t1) {
        return this.lerpColor(c0, c1, (t - t0) / (t1 - t0));
      }
    }
    return 0x1A0040;
  }

  private lerpColor(a: number, b: number, t: number): number {
    const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
    const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
    return (
      (Math.round(ar + (br - ar) * t) << 16) |
      (Math.round(ag + (bg - ag) * t) << 8) |
      Math.round(ab + (bb - ab) * t)
    );
  }

  render(state: RenderState): void {
    if (!this.ready) return;
    const { timeOfDay, entities, weather, width, height } = state;
    this.drawSky(timeOfDay, width, height);
    this.syncEntities(entities);
    this.updateCloudVisibility(weather.cloudCoverage);
  }

  private syncEntities(entities: EntityInstance[]): void {
    const liveIds = new Set(entities.map(e => e.id));

    for (const [id, gfx] of this.entityGraphics) {
      if (!liveIds.has(id)) {
        this.entityLayer.removeChild(gfx);
        gfx.destroy();
        this.entityGraphics.delete(id);
        this.entityStateCache.delete(id);
      }
    }

    for (const entity of entities) {
      const cachedState = this.entityStateCache.get(entity.id);

      if (!this.entityGraphics.has(entity.id)) {
        const gfx = new Graphics();
        gfx.position.set(entity.x, entity.y);
        this.drawEntity(gfx, entity);
        this.entityLayer.addChild(gfx);
        this.entityGraphics.set(entity.id, gfx);
        this.entityStateCache.set(entity.id, entity.state);
      } else if (cachedState !== entity.state) {
        const gfx = this.entityGraphics.get(entity.id)!;
        gfx.clear();
        this.drawEntity(gfx, entity);
        this.entityStateCache.set(entity.id, entity.state);
      }
    }
  }

  private drawEntity(g: Graphics, entity: EntityInstance): void {
    const colors = ENTITY_COLORS[entity.type];
    const sizes = ENTITY_SIZES[entity.type];
    if (!colors || !sizes) return;

    const color = colors[entity.state];
    const size = sizes[entity.state];

    switch (entity.type) {
      case 'grass': {
        const w = size * 0.22;
        g.rect(-w, -size, w * 2, size).fill(color);
        break;
      }
      case 'flower': {
        g.rect(-1.5, -size * 0.65, 3, size * 0.65).fill(0x228B22);
        g.circle(0, -size * 0.82, size * 0.32).fill(color);
        break;
      }
      case 'tree': {
        const tw = size * 0.18;
        g.rect(-tw, -size * 0.42, tw * 2, size * 0.42).fill(0x8B4513);
        g.circle(0, -size * 0.63, size * 0.43).fill(color);
        break;
      }
    }
  }

  private updateCloudVisibility(cloudCoverage: number): void {
    const visible = Math.round(cloudCoverage * this.clouds.length);
    this.clouds.forEach((cloud, i) => {
      cloud.alpha = i < visible ? 0.75 : 0;
    });
  }

  resize(width: number, height: number): void {
    if (!this.ready) return;
    this.canvasWidth = width;
    this.app.renderer.resize(width, height);
  }

  destroy(): void {
    if (!this.ready) return;
    this.ready = false;
    this.entityGraphics.clear();
    this.entityStateCache.clear();
    this.clouds = [];
    if (this.app.canvas.parentNode) {
      this.app.canvas.parentNode.removeChild(this.app.canvas);
    }
    this.app.destroy();
  }
}
