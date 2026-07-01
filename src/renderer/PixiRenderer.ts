import { Application, Container, Graphics, Sprite } from 'pixi.js';
import type { IRenderer } from './IRenderer';
import type { RenderState } from '../types/renderer';
import type { TileData, TileGrid } from '../types/tile';
import type { Flower } from '../types/flower';
import type { Tree } from '../types/tree';
import type { Rock } from '../types/rock';
import type { IDecoration } from '../decoration/IDecoration';
import type { IAnimal } from '../animal/IAnimal';
import { islandConfig } from '../config/islandConfig';
import { assetRegistry } from '../assets/AssetRegistry';
import { AnimationController } from '../animation/AnimationController';
import { compareScene, facingFlipX, sceneDepth } from './sceneOrder';
import {
  tileTopVariant,
  waterPhase,
  shorelineVariant,
  cornerVariant,
} from './terrainVariant';
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

/** A reusable scene-draw entry: exactly one of `tree`/`animal` is set. */
interface SceneItem {
  tileX: number;
  tileY: number;
  tree: Tree | null;
  animal: IAnimal | null;
}

function sortBackToFront(tiles: TileData[]): TileData[] {
  return [...tiles].sort((a, b) => {
    return sceneDepth(a.col, a.row) - sceneDepth(b.col, b.row) || a.col - b.col;
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
  // Terrain sprite layer: textured iso tile tops, cliff faces, corner rounding.
  // Rebuilt on sim update (in drawTiles); sits above tileG (which holds the
  // primitive-diamond + trapezoid fallbacks) and below the animated water.
  private terrainS!: Container;
  // Animated pond layer: the 4-frame ripple + shoreline foam, rebuilt every
  // ticker frame in drawWater so water moves independently of sim updates.
  private waterS!: Container;
  private vegG!: Graphics;
  private decorationG!: Graphics;
  private rockG!: Graphics;
  private flowerG!: Graphics;
  // Sprite layers — parallel to the Graphics layers; populated only when an
  // asset has a real texture. Empty today (placeholders draw primitives).
  private decorationS!: Container;
  private rockS!: Container;
  private flowerS!: Container;
  // Trees and animals share one depth-sorted layer so a tall object (a tree)
  // correctly occludes an animal behind it and is occluded by one in front. Each
  // scene item becomes its own display object (a Sprite when textured, a Graphics
  // when a primitive placeholder) added back-to-front by tile depth every frame.
  private sceneLayer!: Container;
  // One animation controller per animated instance, keyed by a caller-chosen id.
  private readonly controllers = new Map<string, AnimationController>();
  // One ripple controller per water tile, keyed `${col}:${row}`, phase-offset so
  // ponds don't animate in lockstep. Pruned when the water set changes.
  private readonly waterControllers = new Map<string, AnimationController>();
  // Water tiles cached on sim update for the per-frame ripple pass (screen pos +
  // the static land-facing foam edge, if any).
  private currentWaterTiles: { col: number; row: number; x: number; y: number; shore: string | null }[] = [];
  // Reused, pooled draw-order scratch for the per-frame tree+animal depth sort.
  private readonly sceneScratch: SceneItem[] = [];
  private currentAnimals: IAnimal[] = [];
  private currentTrees: Tree[] = [];
  private currentTimeOfDay = 0.5;
  private tick: (() => void) | null = null;
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
    this.terrainS = new Container();
    this.waterS = new Container();
    this.vegG = new Graphics();
    this.decorationG = new Graphics();
    this.rockG = new Graphics();
    this.flowerG = new Graphics();
    this.decorationS = new Container();
    this.rockS = new Container();
    this.flowerS = new Container();
    this.sceneLayer = new Container();

    // Ground layers back-to-front, then the shared tree+animal scene layer on top.
    // Flowers stay below the scene layer (flowers always under animals); trees
    // stay above ground decorations because they live in the scene layer.
    this.app.stage.addChild(this.shadowG);
    this.app.stage.addChild(this.tileG);
    this.app.stage.addChild(this.terrainS); // textured tops/cliffs/corners over the primitive base
    this.app.stage.addChild(this.waterS); // animated ripple + foam, above the tops
    this.app.stage.addChild(this.vegG);
    this.app.stage.addChild(this.decorationG, this.decorationS);
    this.app.stage.addChild(this.rockG, this.rockS);
    this.app.stage.addChild(this.flowerG, this.flowerS);
    this.app.stage.addChild(this.sceneLayer);

    this.buildShadow();

    // The scene layer (trees + animals) redraws every frame for smooth,
    // FPS-independent animation and correct per-frame depth ordering. Keep the
    // handle so destroy() can remove it explicitly.
    this.tick = () => {
      this.drawWater();
      this.drawScene(performance.now());
    };
    this.app.ticker.add(this.tick);

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
   * Draw a sprite for an asset id, optionally selecting a `variant` frame (a
   * tree's growth stage, a rock's size — an opaque string from simulation data).
   * Returns true if a texture was found; false → caller draws its primitive
   * placeholder. Generic: never branches on what the object is.
   */
  private paintSprite(layer: Container, assetId: string, x: number, y: number, variant?: string): boolean {
    const texture = assetRegistry.getVariantTexture(assetId, variant);
    if (!texture) return false;
    this.paintTexture(layer, texture, x, y);
    return true;
  }

  /** Add a bottom-centre-anchored sprite; `flipX` mirrors it (west facing). */
  private paintTexture(
    layer: Container,
    texture: Texture,
    x: number,
    y: number,
    flipX = false,
  ): void {
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5, 1);
    sprite.scale.x = flipX ? -1 : 1;
    sprite.position.set(x, y);
    layer.addChild(sprite);
  }

  /**
   * Resolve the frame texture + horizontal flip for an animal in its current
   * state and facing. Fully generic — the renderer never names a species.
   *
   * Facing → art:
   *   • A directional clip `${state}_${facing}` (e.g. `walking_north`) wins if
   *     the asset ships one — future-proofing for north/south art.
   *   • Otherwise the base `${state}` clip (authored east-facing) plays, and
   *     `west` mirrors it via `flipX`. North/south with no directional art fall
   *     back to the east art unflipped — graceful, no simulation change.
   *
   * One AnimationController per animal id advances the clip; switching state or
   * facing-variant restarts it, so a walk stops the instant the animal idles.
   */
  private resolveAnimalFrame(
    animal: IAnimal,
    assetId: string,
    deltaMs: number,
  ): { texture: Texture | null; flipX: boolean } {
    const directionalId = `${animal.state}_${animal.facing}`;
    // One lookup for the directional variant; fall back to the base state clip.
    let clip = assetRegistry.getAnimation(assetId, directionalId);
    const hasDirectional = clip !== null;
    const clipId = hasDirectional ? directionalId : animal.state;
    if (!clip) clip = assetRegistry.getAnimation(assetId, animal.state);

    let texture: Texture | null = null;
    if (clip) {
      let controller = this.controllers.get(animal.id);
      if (!controller) {
        controller = new AnimationController();
        this.controllers.set(animal.id, controller);
      }
      controller.play(clipId, clip); // no-op if unchanged; restarts on state/facing change
      controller.update(deltaMs);
      const frame = controller.currentFrame();
      texture = frame ? assetRegistry.getFrameTexture(assetId, frame) : null;
    }
    if (!texture) texture = assetRegistry.getStaticTexture(assetId);

    return { texture, flipX: facingFlipX(animal.facing, hasDirectional) };
  }

  render(state: RenderState): void {
    if (!this.ready) return;
    const sorted = sortBackToFront(state.tileGrid.tiles);
    this.drawTiles(sorted, state.tileGrid, state.timeOfDay);
    this.drawVegetation(sorted);
    this.drawDecorations(state.decorations, state.timeOfDay);
    this.drawRocks(state.rocks, state.timeOfDay);
    this.drawFlowers(state.flowers, state.timeOfDay);
    // Trees + animals draw together in the ticker's depth-sorted pass, for smooth
    // animation and correct occlusion; cache their inputs.
    this.currentTrees = state.trees;
    this.currentAnimals = state.animals;
    this.currentTimeOfDay = state.timeOfDay;

    // Prune controllers for animals that no longer exist. Done here (on sim update)
    // rather than per ticker frame — the animal set only changes on a sim tick.
    if (this.controllers.size > 0) {
      const liveIds = new Set(state.animals.map(a => a.id));
      for (const key of this.controllers.keys()) {
        if (!liveIds.has(key)) this.controllers.delete(key);
      }
    }

    // Same prune for water ripple controllers when the pond shape changes.
    if (this.waterControllers.size > 0) {
      const liveKeys = new Set(this.currentWaterTiles.map(w => `${w.col}:${w.row}`));
      for (const key of this.waterControllers.keys()) {
        if (!liveKeys.has(key)) this.waterControllers.delete(key);
      }
    }
  }

  /**
   * Draw trees + animals into the shared scene layer, back-to-front by tile depth
   * so nearer objects occlude farther ones — an animal north of a tree renders
   * behind it, one to the south in front. Rebuilt each ticker frame (cheap for the
   * island's object counts) so animation stays smooth and depth stays correct.
   */
  private drawScene(tMs: number): void {
    if (!this.ready) return;
    this.clearSprites(this.sceneLayer);
    const deltaMs = this.app.ticker.deltaMS;

    // Build one back-to-front list of trees + animals into a reused, pooled scratch
    // array (no per-frame closures/objects in steady state), then sort + paint by
    // the shared depth metric so nearer objects draw last (on top).
    const scratch = this.sceneScratch;
    let n = 0;
    for (const tree of this.currentTrees) {
      let it = scratch[n];
      if (!it) { it = { tileX: 0, tileY: 0, tree: null, animal: null }; scratch[n] = it; }
      it.tileX = tree.tileX; it.tileY = tree.tileY; it.tree = tree; it.animal = null;
      n++;
    }
    for (const animal of this.currentAnimals) {
      let it = scratch[n];
      if (!it) { it = { tileX: 0, tileY: 0, tree: null, animal: null }; scratch[n] = it; }
      it.tileX = animal.tileX; it.tileY = animal.tileY; it.tree = null; it.animal = animal;
      n++;
    }
    scratch.length = n; // drop stale trailing entries so sort/iterate see only this frame
    scratch.sort(compareScene);
    for (let i = 0; i < n; i++) {
      const it = scratch[i];
      if (it.tree) this.addTree(it.tree);
      else if (it.animal) this.addAnimal(it.animal, deltaMs, tMs);
    }
  }

  /** Paint one tree into the scene layer: sprite if art loaded, else primitive. */
  private addTree(tree: Tree): void {
    const base = screenPos(tree.tileX, tree.tileY);
    const x = base.x + tree.offsetX;
    const y = base.y + tree.offsetY;
    if (this.paintSprite(this.sceneLayer, ASSET_IDS.treeOak, x, y, tree.stage)) return;

    const pal = assetRegistry.requireMetadata<TreePalette>(ASSET_IDS.treeOak);
    const dims = pal.dims[tree.stage];
    const trunk = ambientColor(pal.trunk, this.currentTimeOfDay);
    const canopy = ambientColor(pal.canopy, this.currentTimeOfDay);
    const canopyLight = ambientColor(pal.canopyLight, this.currentTimeOfDay);

    const g = new Graphics();
    g.rect(Math.round(x) - dims.trunkW / 2, Math.round(y) - dims.trunkH, dims.trunkW, dims.trunkH).fill(trunk);
    const cy = y - dims.trunkH - dims.canopyR * 0.4;
    g.circle(x, cy, dims.canopyR).fill(canopy);
    g.circle(x - dims.canopyR * 0.35, cy - dims.canopyR * 0.25, dims.canopyR * 0.6).fill(canopyLight);
    this.sceneLayer.addChild(g);
  }

  /** Paint one animal into the scene layer: sprite (facing-aware) or primitive. */
  private addAnimal(animal: IAnimal, deltaMs: number, tMs: number): void {
    const assetId = ASSET_IDS.animal(animal.species);
    if (!assetRegistry.has(assetId)) return; // no asset → not rendered

    const base = screenPos(animal.tileX, animal.tileY);
    const { texture, flipX } = this.resolveAnimalFrame(animal, assetId, deltaMs);
    if (texture) {
      this.paintTexture(this.sceneLayer, texture, base.x, base.y, flipX);
      return;
    }
    this.paintAnimalPrimitive(animal, assetId, base.x, base.y, tMs);
  }

  /** Primitive placeholder animal — drawn only when the sprite fails to load. */
  private paintAnimalPrimitive(animal: IAnimal, assetId: string, x: number, yBase: number, tMs: number): void {
    const pal = assetRegistry.requireMetadata<AnimalPalette>(assetId);
    const phase = tMs / 1000;
    const body = ambientColor(pal.body, this.currentTimeOfDay);
    const dark = ambientColor(pal.dark, this.currentTimeOfDay);
    const g = new Graphics();

    let y = yBase;
    let squash = 1;
    if (animal.state === 'walking') {
      y -= Math.abs(Math.sin(phase * 6)) * 2; // small bob
    } else if (animal.state === 'idle') {
      squash = 1 + Math.sin(phase * 1.5) * 0.06; // slow breathing
    }

    if (animal.state === 'sleeping') {
      g.ellipse(x, y - 1, 5, 2.6).fill(body);
      const zy = y - 7 - Math.sin(phase * 1.2) * 1;
      g.rect(Math.round(x + 4), Math.round(zy), 2, 1).fill(dark);
    } else {
      const ry = 4 * squash;
      g.ellipse(x, y - ry, 4, ry).fill(body);
      g.circle(x + (animal.facing === 'west' ? -3 : 3), y - ry - 2, 2.2).fill(body);
      const ex = x + (animal.facing === 'west' ? -3 : 3);
      g.rect(ex - 1.5, y - ry - 7, 1, 4).fill(dark);
      g.rect(ex + 0.5, y - ry - 7, 1, 4).fill(dark);
    }
    this.sceneLayer.addChild(g);
  }

  private drawDecorations(decorations: IDecoration[], timeOfDay: number): void {
    this.decorationG.clear();
    this.clearSprites(this.decorationS);

    const sorted = [...decorations].sort(
      (a, b) => sceneDepth(a.tileX, a.tileY) - sceneDepth(b.tileX, b.tileY),
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
      (a, b) => sceneDepth(a.tileX, a.tileY) - sceneDepth(b.tileX, b.tileY),
    );

    for (const rock of sorted) {
      const base = screenPos(rock.tileX, rock.tileY);
      const x = base.x + rock.offsetX;
      const y = base.y + rock.offsetY;
      if (this.paintSprite(this.rockS, ASSET_IDS.rock, x, y, rock.type)) continue;

      const r = pal.dims[rock.type];
      const body = ambientColor(pal.body, timeOfDay);
      const light = ambientColor(pal.light, timeOfDay);

      // Boulder: squat ellipse body + a lighter top-left highlight.
      this.rockG.ellipse(x, y - r * 0.4, r, r * 0.7).fill(body);
      this.rockG.ellipse(x - r * 0.3, y - r * 0.6, r * 0.45, r * 0.3).fill(light);
    }
  }

  private drawFlowers(flowers: Flower[], timeOfDay: number): void {
    this.flowerG.clear();
    this.clearSprites(this.flowerS);

    // Depth-sort so front flowers overlap back ones correctly.
    const sorted = [...flowers].sort(
      (a, b) => sceneDepth(a.tileX, a.tileY) - sceneDepth(b.tileX, b.tileY),
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

  private drawTiles(tiles: TileData[], grid: TileGrid, timeOfDay: number): void {
    this.tileG.clear();
    this.clearSprites(this.terrainS);

    // Palette drives every primitive fallback; the sprite tint is the ambient of
    // white, so day is identity and night dims/blues by the same curve.
    const p = assetRegistry.requireMetadata<TilePalette>(ASSET_IDS.tile);
    const tint = ambientColor(0xffffff, timeOfDay);
    const water: { col: number; row: number; x: number; y: number; shore: string | null }[] = [];

    for (const tile of tiles) {
      const { x, y } = screenPos(tile.col, tile.row);

      // ── Top face: textured sprite when the art loaded, else primitive diamond ──
      if (tile.terrainType === 'water') {
        // Primitive water base always drawn (fallback if the ripple art is
        // absent); the animated sprite in drawWater overlays it when art loads.
        this.paintDiamond(x, y, ambientColor(p.water, timeOfDay));
        water.push({ col: tile.col, row: tile.row, x, y, shore: shorelineVariant(grid, tile) });
      } else {
        const { assetId, frame } = tileTopVariant(tile);
        const tex = assetRegistry.getVariantTexture(assetId, frame);
        if (tex) {
          this.paintTileTop(this.terrainS, tex, x, y, tint);
        } else {
          this.paintDiamond(
            x,
            y,
            ambientColor(lerpColor(p.dirt, p.grass, tile.grassLevel), timeOfDay),
          );
        }
      }

      // ── Cliff faces (perimeter edges) ──
      if (tile.col === 0) this.paintWall('left', x, y, timeOfDay, p);
      if (tile.row === size - 1) this.paintWall('right', x, y, timeOfDay, p);

      // ── Rounded silhouette corners (4 vertices; absent → square, today's look) ──
      const corner = cornerVariant(tile.col, tile.row, size);
      if (corner) {
        const tex = assetRegistry.getFrameTexture(ASSET_IDS.corner, corner);
        // 40x24 frame; its diamond sits at frame-row 10 → align to the tile top.
        if (tex) this.paintTileTop(this.terrainS, tex, x, y, tint, 10 / 24);
      }
    }

    this.currentWaterTiles = water;
  }

  /** Primitive iso-diamond top/water fallback into the tile Graphics layer. */
  private paintDiamond(x: number, y: number, color: number): void {
    this.tileG
      .poly([
        { x, y: y - HH },
        { x: x + HW, y },
        { x, y: y + HH },
        { x: x - HW, y },
      ])
      .fill(color);
  }

  /**
   * Paint a centred terrain sprite (tile top / water / shoreline / corner) at the
   * diamond centre, day/night-tinted. `anchorY` lets the taller corner frame sit
   * with its diamond aligned to the tile top.
   */
  private paintTileTop(
    layer: Container,
    texture: Texture,
    x: number,
    y: number,
    tint: number,
    anchorY = 0.5,
  ): void {
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5, anchorY);
    sprite.position.set(x, y);
    sprite.tint = tint;
    layer.addChild(sprite);
  }

  /**
   * A cliff face. Tries the textured parallelogram sprite (anchored to the wall's
   * screen origin); falls back to the flat trapezoid fill — identical geometry to
   * the pre-sprite renderer.
   */
  private paintWall(
    side: 'left' | 'right',
    x: number,
    y: number,
    timeOfDay: number,
    p: TilePalette,
  ): void {
    const tex = assetRegistry.getStaticTexture(
      side === 'left' ? ASSET_IDS.cliffLeft : ASSET_IDS.cliffRight,
    );
    if (tex) {
      const sprite = new Sprite(tex);
      sprite.anchor.set(0, 0);
      sprite.position.set(side === 'left' ? x - HW : x, y);
      sprite.tint = ambientColor(0xffffff, timeOfDay);
      this.terrainS.addChild(sprite);
      return;
    }
    if (side === 'left') {
      this.tileG
        .poly([
          { x: x - HW, y },
          { x, y: y + HH },
          { x, y: y + HH + sideH },
          { x: x - HW, y: y + sideH },
        ])
        .fill(ambientColor(p.wallL, timeOfDay));
    } else {
      this.tileG
        .poly([
          { x, y: y + HH },
          { x: x + HW, y },
          { x: x + HW, y: y + sideH },
          { x, y: y + HH + sideH },
        ])
        .fill(ambientColor(p.wallR, timeOfDay));
    }
  }

  /**
   * Per-frame pond pass: advances each water tile's ripple controller (phase-
   * offset for desync) and paints the current frame + its foam edge into waterS.
   * No water art → no overlay, the primitive water base from drawTiles shows.
   */
  private drawWater(): void {
    if (!this.ready) return;
    this.clearSprites(this.waterS);
    if (this.currentWaterTiles.length === 0) return;

    const clip = assetRegistry.getAnimation(ASSET_IDS.water, 'ripple');
    const tint = ambientColor(0xffffff, this.currentTimeOfDay);
    const dt = this.app.ticker.deltaMS;

    for (const w of this.currentWaterTiles) {
      if (clip) {
        const key = `${w.col}:${w.row}`;
        let ctrl = this.waterControllers.get(key);
        if (!ctrl) {
          ctrl = new AnimationController();
          ctrl.play('ripple', clip);
          // Deterministic phase offset so ponds don't ripple in lockstep.
          ctrl.update(waterPhase(w.col, w.row, clip.frames.length) * clip.frameDurationMs);
          this.waterControllers.set(key, ctrl);
        }
        ctrl.play('ripple', clip); // no-op once playing
        ctrl.update(dt);
        const frame = ctrl.currentFrame();
        const tex = frame ? assetRegistry.getFrameTexture(ASSET_IDS.water, frame) : null;
        if (tex) this.paintTileTop(this.waterS, tex, w.x, w.y, tint);
      }
      // Foam sits above the ripple.
      if (w.shore) {
        const tex = assetRegistry.getFrameTexture(ASSET_IDS.shoreline, w.shore);
        if (tex) this.paintTileTop(this.waterS, tex, w.x, w.y, tint);
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
    if (this.tick) {
      this.app.ticker.remove(this.tick);
      this.tick = null;
    }
    // Drop per-instance state so nothing dangles on the module-level singleton.
    this.controllers.clear();
    this.waterControllers.clear();
    this.currentWaterTiles = [];
    this.sceneScratch.length = 0;
    this.currentAnimals = [];
    this.currentTrees = [];
    // Destroy the app + its display tree (frees layer/scene GPU geometry). Keep
    // textures — they are shared, owned by the AssetRegistry, and reused on re-init.
    this.app.destroy(
      { removeView: true },
      { children: true, texture: false, textureSource: false },
    );
  }
}
