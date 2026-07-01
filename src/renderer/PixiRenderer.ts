import { Application, Container, Graphics, Sprite } from 'pixi.js';
import type { IRenderer } from './IRenderer';
import type { RenderState } from '../types/renderer';
import type { TileData } from '../types/tile';
import type { Flower } from '../types/flower';
import type { Tree } from '../types/tree';
import type { Rock } from '../types/rock';
import type { IDecoration } from '../decoration/IDecoration';
import type { IAnimal } from '../animal/IAnimal';
import { islandConfig } from '../config/islandConfig';
import { assetRegistry } from '../assets/AssetRegistry';
import { AnimationController } from '../animation/AnimationController';
import type { Texture } from 'pixi.js';
import {
  PLACEHOLDER_ASSET_PACK,
  ASSET_IDS,
  type TilePalette,
  type TuftPalette,
  type FlowerPalette,
  type TreePalette,
  type RockPalette,
  type LilypadPalette,
  type FernPalette,
  type BushPalette,
  type TallGrassPalette,
  type AnimalPalette,
} from '../assets/placeholderPack';

const { size, tileW, tileH, sideH } = islandConfig.grid;
const { x: CX, y: CY } = islandConfig.center;
const HW = tileW / 2;
const HH = tileH / 2;

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

/**
 * Renders the island. It never knows where visuals come from: every colour,
 * dimension and (future) texture is obtained from AssetRegistry by asset id. If
 * an asset has a loaded texture it is drawn as a sprite; otherwise the primitive
 * placeholder is drawn from the asset's palette metadata. Registering real art
 * (or a marketplace skin) under the same ids lights it up with no changes here.
 */
export class PixiRenderer implements IRenderer {
  private app!: Application;
  private shadowG!: Graphics;
  private tileG!: Graphics;
  private vegG!: Graphics;
  private decorationG!: Graphics;
  private rockG!: Graphics;
  private flowerG!: Graphics;
  private treeG!: Graphics;
  private animalG!: Graphics;
  // Sprite layers — parallel to the Graphics layers; populated only when an
  // asset has a real texture. Empty today (placeholders draw primitives).
  private decorationS!: Container;
  private rockS!: Container;
  private flowerS!: Container;
  private treeS!: Container;
  private animalS!: Container;
  // One animation controller per animated instance, keyed by a caller-chosen id.
  // Empty until assets ship animation clips + frame textures.
  private readonly controllers = new Map<string, AnimationController>();
  private currentAnimals: IAnimal[] = [];
  private currentTimeOfDay = 0.5;
  private ready = false;

  async init(container: HTMLElement, width: number, height: number): Promise<void> {
    if (this.ready) this.destroy();

    // Register + load Bloom's built-in visuals through the registry (idempotent).
    // The placeholder pack references no art today, so loading is a no-op; real
    // packs (art / marketplace / seasonal) light up the same way.
    if (!assetRegistry.registeredPacks().includes(PLACEHOLDER_ASSET_PACK.id)) {
      await assetRegistry.loadPack(PLACEHOLDER_ASSET_PACK);
    }
    // Load art for every registered descriptor (content-pack spritesheets, etc.).
    // Generic and species-agnostic: a species' art lights up from its pack with no
    // renderer changes. Guarded so missing art degrades to the placeholder.
    await assetRegistry.preloadAll();

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
    this.decorationG = new Graphics();
    this.rockG = new Graphics();
    this.flowerG = new Graphics();
    this.treeG = new Graphics();
    this.animalG = new Graphics();
    this.decorationS = new Container();
    this.rockS = new Container();
    this.flowerS = new Container();
    this.treeS = new Container();
    this.animalS = new Container();

    // Primitive layer + its sprite layer, back-to-front.
    this.app.stage.addChild(this.shadowG);
    this.app.stage.addChild(this.tileG);
    this.app.stage.addChild(this.vegG);
    this.app.stage.addChild(this.decorationG, this.decorationS);
    this.app.stage.addChild(this.rockG, this.rockS);
    this.app.stage.addChild(this.flowerG, this.flowerS);
    this.app.stage.addChild(this.treeG, this.treeS);
    this.app.stage.addChild(this.animalG, this.animalS);

    this.buildShadow();

    // Animals redraw every frame for subtle, FPS-independent animation.
    this.app.ticker.add(() => this.drawAnimals(performance.now()));

    this.ready = true;
  }

  private buildShadow(): void {
    const shadowY = CY + (size - 1) * HH + HH + sideH + 14;
    const shadowRX = (size - 1) * HW * 0.82;
    this.shadowG.ellipse(CX, shadowY, shadowRX, 16).fill({ color: 0x000000, alpha: 0.22 });
  }

  /** Empty a sprite layer, freeing its children. */
  private clearSprites(layer: Container): void {
    for (const child of layer.removeChildren()) child.destroy();
  }

  /**
   * The renderer's one texture entry point. If the asset id has a loaded texture,
   * draw it as a sprite (bottom-centre anchored at the tile point) and return
   * true; otherwise return false so the caller draws its primitive placeholder.
   */
  private paintSprite(layer: Container, assetId: string, x: number, y: number): boolean {
    const texture = assetRegistry.getStaticTexture(assetId);
    if (!texture) return false;
    this.paintTexture(layer, texture, x, y);
    return true;
  }

  private paintTexture(layer: Container, texture: Texture, x: number, y: number): void {
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5, 1);
    sprite.position.set(x, y);
    layer.addChild(sprite);
  }

  /**
   * Resolve the texture to draw for an asset in a given state. If the asset
   * defines an animation for that state, an AnimationController (owned here, one
   * per instance key) advances by `deltaMs` and its current frame texture is
   * used; otherwise the asset's static texture is returned. Returns null when the
   * asset has neither — the caller then draws its primitive placeholder.
   *
   * This is fully generic: animals, decorations, weather or UI all resolve frames
   * the same way. Animation state comes from the caller (simulation/asset state);
   * the renderer never knows what it is animating. Dormant until assets ship
   * clips + frame textures, so today it always yields the static/placeholder path.
   */
  private resolveTexture(
    instanceKey: string,
    assetId: string,
    state: string,
    deltaMs: number,
  ): Texture | null {
    const clip = assetRegistry.getAnimation(assetId, state);
    if (clip) {
      let controller = this.controllers.get(instanceKey);
      if (!controller) {
        controller = new AnimationController();
        this.controllers.set(instanceKey, controller);
      }
      controller.play(state, clip); // no-op if unchanged; restarts on state change
      controller.update(deltaMs);
      const frame = controller.currentFrame();
      const frameTexture = frame ? assetRegistry.getFrameTexture(assetId, frame) : null;
      if (frameTexture) return frameTexture;
    }
    return assetRegistry.getStaticTexture(assetId);
  }

  render(state: RenderState): void {
    if (!this.ready) return;
    const sorted = sortBackToFront(state.tileGrid.tiles);
    this.drawTiles(sorted, state.timeOfDay);
    this.drawVegetation(sorted);
    this.drawDecorations(state.decorations, state.timeOfDay);
    this.drawRocks(state.rocks, state.timeOfDay);
    this.drawFlowers(state.flowers, state.timeOfDay);
    this.drawTrees(state.trees, state.timeOfDay);
    // Animals are drawn by the ticker for smooth animation; cache inputs.
    this.currentAnimals = state.animals;
    this.currentTimeOfDay = state.timeOfDay;
  }

  private drawAnimals(tMs: number): void {
    if (!this.ready) return;
    this.animalG.clear();
    this.clearSprites(this.animalS);

    // Drop controllers for animals that no longer exist.
    const liveIds = new Set(this.currentAnimals.map(a => a.id));
    for (const key of this.controllers.keys()) {
      if (!liveIds.has(key)) this.controllers.delete(key);
    }
    const deltaMs = this.app.ticker.deltaMS;

    const sorted = [...this.currentAnimals].sort(
      (a, b) => a.tileY + a.tileX - (b.tileY + b.tileX),
    );

    for (const animal of sorted) {
      const assetId = ASSET_IDS.animal(animal.species);
      if (!assetRegistry.has(assetId)) continue; // no asset → not rendered

      const base = screenPos(animal.tileX, animal.tileY);
      // Animation-aware texture (frame or static); null → primitive placeholder.
      const texture = this.resolveTexture(animal.id, assetId, animal.state, deltaMs);
      if (texture) {
        this.paintTexture(this.animalS, texture, base.x, base.y);
        continue;
      }

      const pal = assetRegistry.requireMetadata<AnimalPalette>(assetId);
      const phase = tMs / 1000;
      const body = ambientColor(pal.body, this.currentTimeOfDay);
      const dark = ambientColor(pal.dark, this.currentTimeOfDay);

      const x = base.x;
      let y = base.y;
      let squash = 1;

      if (animal.state === 'walking') {
        y -= Math.abs(Math.sin(phase * 6)) * 2; // small bob
      } else if (animal.state === 'idle') {
        squash = 1 + Math.sin(phase * 1.5) * 0.06; // slow breathing
      }

      if (animal.state === 'sleeping') {
        // Lowered resting pose + subtle "z".
        this.animalG.ellipse(x, y - 1, 5, 2.6).fill(body);
        const zy = y - 7 - Math.sin(phase * 1.2) * 1;
        this.animalG.rect(Math.round(x + 4), Math.round(zy), 2, 1).fill(dark);
      } else {
        const ry = 4 * squash;
        // Body
        this.animalG.ellipse(x, y - ry, 4, ry).fill(body);
        // Head
        this.animalG.circle(x + (animal.facing === 'west' ? -3 : 3), y - ry - 2, 2.2).fill(body);
        // Ears
        const ex = x + (animal.facing === 'west' ? -3 : 3);
        this.animalG.rect(ex - 1.5, y - ry - 7, 1, 4).fill(dark);
        this.animalG.rect(ex + 0.5, y - ry - 7, 1, 4).fill(dark);
      }
    }
  }

  private drawDecorations(decorations: IDecoration[], timeOfDay: number): void {
    this.decorationG.clear();
    this.clearSprites(this.decorationS);

    const sorted = [...decorations].sort(
      (a, b) => a.tileY + a.tileX - (b.tileY + b.tileX),
    );

    for (const deco of sorted) {
      const { x, y } = screenPos(deco.tileX, deco.tileY);
      const assetId = ASSET_IDS.decoration(deco.decorationType);
      if (!assetRegistry.has(assetId)) continue;
      if (this.paintSprite(this.decorationS, assetId, x, y)) continue;

      switch (deco.decorationType) {
        case 'lilypad': {
          const p = assetRegistry.requireMetadata<LilypadPalette>(assetId);
          const pad = ambientColor(p.pad, timeOfDay);
          const rim = ambientColor(p.rim, timeOfDay);
          // Flat pad on the water surface; small notch hint via rim arc.
          this.decorationG.ellipse(x, y, 7, 4).fill(pad);
          this.decorationG.ellipse(x - 1.5, y - 1, 3.5, 2).fill(rim);
          break;
        }
        case 'fern': {
          const p = assetRegistry.requireMetadata<FernPalette>(assetId);
          const frond = ambientColor(p.frond, timeOfDay);
          // A few upright angled fronds.
          for (const dx of [-3, 0, 3]) {
            this.decorationG
              .poly([
                { x: x + dx, y },
                { x: x + dx - 1, y: y - 8 },
                { x: x + dx + 1, y: y - 8 },
              ])
              .fill(frond);
          }
          break;
        }
        case 'bush': {
          const p = assetRegistry.requireMetadata<BushPalette>(assetId);
          const body = ambientColor(p.body, timeOfDay);
          const light = ambientColor(p.light, timeOfDay);
          this.decorationG.ellipse(x, y - 3, 6, 4.5).fill(body);
          this.decorationG.circle(x - 2, y - 4.5, 2.2).fill(light);
          break;
        }
        case 'tall_grass': {
          const p = assetRegistry.requireMetadata<TallGrassPalette>(assetId);
          const blade = ambientColor(p.blade, timeOfDay);
          for (const dx of [-3, -1, 1, 3]) {
            this.decorationG.rect(Math.round(x + dx), Math.round(y) - 7, 1, 7).fill(blade);
          }
          break;
        }
        default:
          break;
      }
    }
  }

  private drawRocks(rocks: Rock[], timeOfDay: number): void {
    this.rockG.clear();
    this.clearSprites(this.rockS);

    const pal = assetRegistry.requireMetadata<RockPalette>(ASSET_IDS.rock);
    const sorted = [...rocks].sort(
      (a, b) => a.tileY + a.tileX - (b.tileY + b.tileX),
    );

    for (const rock of sorted) {
      const base = screenPos(rock.tileX, rock.tileY);
      const x = base.x + rock.offsetX;
      const y = base.y + rock.offsetY;
      if (this.paintSprite(this.rockS, ASSET_IDS.rock, x, y)) continue;

      const r = pal.dims[rock.type];
      const body = ambientColor(pal.body, timeOfDay);
      const light = ambientColor(pal.light, timeOfDay);

      // Boulder: squat ellipse body + a lighter top-left highlight.
      this.rockG.ellipse(x, y - r * 0.4, r, r * 0.7).fill(body);
      this.rockG.ellipse(x - r * 0.3, y - r * 0.6, r * 0.45, r * 0.3).fill(light);
    }
  }

  private drawTrees(trees: Tree[], timeOfDay: number): void {
    this.treeG.clear();
    this.clearSprites(this.treeS);

    const pal = assetRegistry.requireMetadata<TreePalette>(ASSET_IDS.treeOak);
    // Depth-sort so front trees overlap back ones correctly.
    const sorted = [...trees].sort(
      (a, b) => a.tileY + a.tileX - (b.tileY + b.tileX),
    );

    for (const tree of sorted) {
      const base = screenPos(tree.tileX, tree.tileY);
      const x = base.x + tree.offsetX;
      const y = base.y + tree.offsetY;
      if (this.paintSprite(this.treeS, ASSET_IDS.treeOak, x, y)) continue;

      const dims = pal.dims[tree.stage];
      const trunk = ambientColor(pal.trunk, timeOfDay);
      const canopy = ambientColor(pal.canopy, timeOfDay);
      const canopyLight = ambientColor(pal.canopyLight, timeOfDay);

      // Trunk rises from the tile point.
      this.treeG
        .rect(Math.round(x) - dims.trunkW / 2, Math.round(y) - dims.trunkH, dims.trunkW, dims.trunkH)
        .fill(trunk);

      // Canopy — layered circles for a little volume.
      const cy = y - dims.trunkH - dims.canopyR * 0.4;
      this.treeG.circle(x, cy, dims.canopyR).fill(canopy);
      this.treeG.circle(x - dims.canopyR * 0.35, cy - dims.canopyR * 0.25, dims.canopyR * 0.6)
        .fill(canopyLight);
    }
  }

  private drawFlowers(flowers: Flower[], timeOfDay: number): void {
    this.flowerG.clear();
    this.clearSprites(this.flowerS);

    // Depth-sort so front flowers overlap back ones correctly.
    const sorted = [...flowers].sort(
      (a, b) => a.tileY + a.tileX - (b.tileY + b.tileX),
    );

    for (const flower of sorted) {
      const base = screenPos(flower.tileX, flower.tileY);
      const x = base.x + flower.offsetX;
      const y = base.y + flower.offsetY;
      const assetId = ASSET_IDS.flower(flower.type);
      if (this.paintSprite(this.flowerS, assetId, x, y)) continue;

      const p = assetRegistry.requireMetadata<FlowerPalette>(assetId);
      const petal = ambientColor(p.petal, timeOfDay);
      const center = ambientColor(p.center, timeOfDay);
      const stem = ambientColor(p.stem, timeOfDay);

      // Stem
      this.flowerG.rect(Math.round(x) - 1, Math.round(y) - 5, 2, 5).fill(stem);
      // Four petals + center
      this.flowerG.circle(x - 2, y - 6, 1.8).fill(petal);
      this.flowerG.circle(x + 2, y - 6, 1.8).fill(petal);
      this.flowerG.circle(x, y - 8, 1.8).fill(petal);
      this.flowerG.circle(x, y - 4, 1.8).fill(petal);
      this.flowerG.circle(x, y - 6, 1.4).fill(center);
    }
  }

  private drawTiles(tiles: TileData[], timeOfDay: number): void {
    this.tileG.clear();

    const p = assetRegistry.requireMetadata<TilePalette>(ASSET_IDS.tile);
    for (const tile of tiles) {
      const { x, y } = screenPos(tile.col, tile.row);
      const baseTop =
        tile.terrainType === 'water' ? p.water : lerpColor(p.dirt, p.grass, tile.grassLevel);
      const top = ambientColor(baseTop, timeOfDay);
      const lWall = ambientColor(p.wallL, timeOfDay);
      const rWall = ambientColor(p.wallR, timeOfDay);

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

    const p = assetRegistry.requireMetadata<TuftPalette>(ASSET_IDS.tuft);
    for (const tile of tiles) {
      if (tile.grassLevel < 0.5) continue;

      const { x, y } = screenPos(tile.col, tile.row);
      const hash = (tile.col * 31 + tile.row * 17) % 7;
      const color = tile.grassLevel > 0.8 ? p.lush : p.sparse;

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
