import { Application, Graphics } from 'pixi.js';
import type { IRenderer } from './IRenderer';
import type { RenderState } from '../types/renderer';
import type { TileData } from '../types/tile';
import { islandConfig } from '../config/islandConfig';

const { size, tileW, tileH, sideH } = islandConfig.grid;
const { x: CX, y: CY } = islandConfig.center;
const HW = tileW / 2;
const HH = tileH / 2;

// Colour palette
const DIRT = 0x9B6B3A;
const GRASS = 0x3D7A1A;
const WALL_L = 0x7A4E2A;
const WALL_R = 0x5C3419;
const TUFT_SPARSE = 0x4A8A22;
const TUFT_LUSH = 0x2D6010;

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  return (
    (Math.round(ar + (br - ar) * t) << 16) |
    (Math.round(ag + (bg - ag) * t) << 8) |
    Math.round(ab + (bb - ab) * t)
  );
}

function screenPos(col: number, row: number): { x: number; y: number } {
  return {
    x: CX + (col - row) * HW,
    y: CY + (col + row) * HH,
  };
}

function nightMult(timeOfDay: number): number {
  if (timeOfDay < 0.45) return 0;
  if (timeOfDay < 0.5) return (timeOfDay - 0.45) / 0.05;
  if (timeOfDay <= 0.9) return 1.0;
  return 1.0 - (timeOfDay - 0.9) / 0.1;
}

function ambientColor(base: number, timeOfDay: number): number {
  const t = nightMult(timeOfDay);
  if (t <= 0) return base;
  return lerpColor(base, 0x001133, t * 0.55);
}

function sortBackToFront(tiles: TileData[]): TileData[] {
  return [...tiles].sort((a, b) => {
    const d = (a.col + a.row) - (b.col + b.row);
    return d !== 0 ? d : a.col - b.col;
  });
}

export class PixiRenderer implements IRenderer {
  private app!: Application;
  private shadowG!: Graphics;
  private tileG!: Graphics;
  private vegG!: Graphics;
  private ready = false;

  async init(container: HTMLElement, width: number, height: number): Promise<void> {
    if (this.ready) this.destroy();

    this.app = new Application();
    await this.app.init({
      width,
      height,
      backgroundAlpha: 0,
      antialias: false,
      resolution: 1,
      autoDensity: false,
    });

    container.appendChild(this.app.canvas);

    this.shadowG = new Graphics();
    this.tileG = new Graphics();
    this.vegG = new Graphics();

    this.app.stage.addChild(this.shadowG);
    this.app.stage.addChild(this.tileG);
    this.app.stage.addChild(this.vegG);

    this.buildShadow();
    this.ready = true;
  }

  private buildShadow(): void {
    const shadowY = CY + (size - 1) * HH + HH + sideH + 14;
    const shadowRX = (size - 1) * HW * 0.82;
    this.shadowG.ellipse(CX, shadowY, shadowRX, 16).fill({ color: 0x000000, alpha: 0.22 });
  }

  render(state: RenderState): void {
    if (!this.ready) return;
    const sorted = sortBackToFront(state.tileGrid.tiles);
    this.drawTiles(sorted, state.timeOfDay);
    this.drawVegetation(sorted);
  }

  private drawTiles(tiles: TileData[], timeOfDay: number): void {
    this.tileG.clear();

    for (const tile of tiles) {
      const { x, y } = screenPos(tile.col, tile.row);
      const baseTop = lerpColor(DIRT, GRASS, tile.grassLevel);
      const top = ambientColor(baseTop, timeOfDay);
      const lWall = ambientColor(WALL_L, timeOfDay);
      const rWall = ambientColor(WALL_R, timeOfDay);

      // Top face — isometric diamond
      this.tileG
        .poly([
          { x, y: y - HH },
          { x: x + HW, y },
          { x, y: y + HH },
          { x: x - HW, y },
        ])
        .fill(top);

      // Left dirt wall — col = 0
      if (tile.col === 0) {
        this.tileG
          .poly([
            { x: x - HW, y },
            { x, y: y + HH },
            { x, y: y + HH + sideH },
            { x: x - HW, y: y + sideH },
          ])
          .fill(lWall);
      }

      // Right dirt wall — row = N-1
      if (tile.row === size - 1) {
        this.tileG
          .poly([
            { x, y: y + HH },
            { x: x + HW, y },
            { x: x + HW, y: y + sideH },
            { x, y: y + HH + sideH },
          ])
          .fill(rWall);
      }
    }
  }

  private drawVegetation(tiles: TileData[]): void {
    this.vegG.clear();

    for (const tile of tiles) {
      if (tile.grassLevel < 0.5) continue;

      const { x, y } = screenPos(tile.col, tile.row);
      const hash = (tile.col * 31 + tile.row * 17) % 7;
      const color = tile.grassLevel > 0.8 ? TUFT_LUSH : TUFT_SPARSE;

      const offsets = [
        { dx: -5, dy: -2 },
        { dx: 5, dy: -1 },
        { dx: -1, dy: 2 },
        { dx: 7, dy: 0 },
      ];

      const count = tile.grassLevel < 0.7 ? 1 : tile.grassLevel < 0.9 ? 2 : 3;

      for (let i = 0; i < count; i++) {
        const off = offsets[(hash + i) % offsets.length];
        const h = 4 + ((hash + i) % 3);
        this.vegG
          .rect(Math.round(x + off.dx), Math.round(y + off.dy - h), 2, h)
          .fill(color);
      }
    }
  }

  resize(width: number, height: number): void {
    if (!this.ready) return;
    this.app.renderer.resize(width, height);
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.ready ? (this.app.canvas as HTMLCanvasElement) : null;
  }

  destroy(): void {
    if (!this.ready) return;
    this.ready = false;
    if (this.app.canvas.parentNode) {
      this.app.canvas.parentNode.removeChild(this.app.canvas);
    }
    this.app.destroy();
  }
}
