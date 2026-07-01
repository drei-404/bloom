// Generates the world-object spritesheets into public/assets/.
//
//   node scripts/gen-world.mjs [contactPreview.png]
//
// Same pixel-art style + palette as the animals (scripts/lib/pixel.mjs). Trees
// and rocks are multi-frame strips whose frame ids are the sim variant (tree
// growth stage / rock size); everything else is a single 32x32 image. Bottom-
// centre of each frame is the tile anchor. Tiles + grass tufts stay primitive
// (renderer draws them), so no sheet here — their palette is retuned in code.

import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { px, rect, ellipse, blob, tri, createSheet, encodePNG } from './lib/pixel.mjs';

const hex = (n) => [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff, 255];
const FW = 32, FH = 32;
const outDir = fileURLToPath(new URL('../public/assets', import.meta.url));

function writeSheet(name, nFrames, drawFrame) {
  const s = createSheet(nFrames);
  for (let i = 0; i < nFrames; i++) drawFrame(s, i * FW, i);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(`${outDir}/${name}.png`, encodePNG(s));
  return s;
}

// ── Palette (cohesive with the animals: warm, natural, minimal) ──────
const C = {
  trunk: hex(0x6b4a2a), trunkDk: hex(0x4e3417),
  canopy: hex(0x5a9a3f), canopyLt: hex(0x77b955), canopyDk: hex(0x3f7029), leafLine: hex(0x2f5320),
  rock: hex(0x969aa1), rockLt: hex(0xc0c4ca), rockDk: hex(0x6d7178), rockLine: hex(0x484c53),
  stem: hex(0x3f7029), center: hex(0xf2c84a),
  padTop: hex(0x54a049), padRim: hex(0x74bd5c), padDk: hex(0x37703a), pink: hex(0xf29ac0),
};

// ── Pine trees — sapling / young / mature (stacked conifer tiers) ────
// Each tier: { by: base y, hw: base half-width, ap: apex height above base }.
const TREE_STAGES = [
  { id: 'sapling', trunkW: 2, trunkH: 3, tiers: [{ by: 28, hw: 5, ap: 8 }, { by: 24, hw: 3.4, ap: 7 }] },
  { id: 'young', trunkW: 2, trunkH: 3, tiers: [{ by: 27, hw: 7, ap: 9 }, { by: 22, hw: 5, ap: 8 }, { by: 18, hw: 3.4, ap: 7 }] },
  { id: 'mature', trunkW: 3, trunkH: 4, tiers: [{ by: 26, hw: 9, ap: 10 }, { by: 21, hw: 7, ap: 9 }, { by: 16, hw: 5, ap: 8.5 }] },
];
function drawTree(s, fx, stage) {
  const cxp = 16, baseY = 30;
  // Trunk.
  rect(s, fx, Math.round(cxp - stage.trunkW / 2) - 1, baseY - stage.trunkH, stage.trunkW + 2, stage.trunkH, C.trunkDk);
  rect(s, fx, Math.round(cxp - stage.trunkW / 2), baseY - stage.trunkH, stage.trunkW, stage.trunkH, C.trunk);
  // Foliage tiers, widest at the bottom, drawn bottom-to-top so upper tiers overlap.
  for (const t of stage.tiers) {
    const ax = cxp - t.hw, bx = cxp + t.hw, apy = t.by - t.ap;
    tri(s, fx, cxp, apy - 1, ax - 1, t.by + 1, bx + 1, t.by + 1, C.leafLine); // outline
    tri(s, fx, cxp, apy, ax, t.by, bx, t.by, C.canopy); // fill
    tri(s, fx, cxp - 0.5, apy + 1, ax + 1, t.by - 0.5, cxp - 0.5, t.by - 0.5, C.canopyLt); // left highlight
    rect(s, fx, Math.round(ax + 1), Math.round(t.by - 1), Math.max(1, Math.round(t.hw * 2 - 2)), 1, C.canopyDk); // shaded underside
  }
}

// ── Rocks — small / medium / large ──────────────────────────────────
const ROCK_SIZES = [
  { id: 'small', r: 4 },
  { id: 'medium', r: 7 },
  { id: 'large', r: 10 },
];
function drawRock(s, fx, rk) {
  const cxp = 16, baseY = 29, r = rk.r;
  ellipse(s, fx, cxp, baseY, r + 1, 1.4, C.rockDk); // ground contact shadow
  blob(s, fx, cxp, baseY - r * 0.5, r, r * 0.75, C.rock, C.rockLine);
  ellipse(s, fx, cxp - r * 0.35, baseY - r * 0.75, r * 0.5, r * 0.32, C.rockLt); // top-left highlight
  ellipse(s, fx, cxp + r * 0.4, baseY - r * 0.2, r * 0.4, r * 0.28, C.rockDk); // lower-right shade
}

// ── Flowers — one image per colour ──────────────────────────────────
function drawFlower(petal, edge) {
  return (s, fx) => {
    const cxp = 16, baseY = 28;
    rect(s, fx, cxp - 1, baseY - 6, 2, 6, C.stem); // stem
    ellipse(s, fx, cxp - 3, baseY - 3, 1.6, 1, C.canopyDk); // leaf
    for (const [dx, dy] of [[-2.6, -8], [2.6, -8], [0, -10.4], [-2.6, -5.4], [2.6, -5.4]]) {
      blob(s, fx, cxp + dx, baseY + dy, 1.8, 1.8, petal, edge);
    }
    ellipse(s, fx, cxp, baseY - 7, 1.6, 1.6, C.center); // center
  };
}

// ── Decorations ─────────────────────────────────────────────────────
function drawBush(s, fx) {
  const cxp = 16, baseY = 29;
  ellipse(s, fx, cxp, baseY, 7, 1.4, C.canopyDk);
  blob(s, fx, cxp, baseY - 4, 7, 5, C.canopy, C.leafLine);
  ellipse(s, fx, cxp - 2.5, baseY - 6, 2.4, 2, C.canopyLt);
  ellipse(s, fx, cxp + 3, baseY - 3.5, 2.4, 2, C.canopyDk);
  ellipse(s, fx, cxp + 1, baseY - 6.5, 1.6, 1.4, C.canopyLt);
}
function drawFern(s, fx) {
  const cxp = 16, baseY = 30;
  for (const [dx, lean] of [[-4, -3], [0, 0], [4, 3]]) {
    const tipx = cxp + dx + lean;
    // Frond stalk + leaflets.
    for (let t = 0; t <= 9; t++) {
      const fx2 = cxp + dx + (lean * t) / 9;
      const fy = baseY - t;
      px(s, fx, fx2, fy, C.canopyDk);
      if (t % 2 === 0 && t > 0) { px(s, fx, fx2 - 1, fy, C.canopy); px(s, fx, fx2 + 1, fy, C.canopy); }
    }
    blob(s, fx, tipx, baseY - 9, 1.2, 1.6, C.canopyLt, C.leafLine);
  }
}
function drawTallGrass(s, fx) {
  const cxp = 16, baseY = 30;
  const blades = [[-4, 7, C.canopy], [-1.5, 10, C.canopyLt], [1, 8, C.canopy], [3.5, 11, C.canopyLt], [5.5, 6, C.canopyDk]];
  for (const [dx, h, col] of blades) {
    for (let t = 0; t < h; t++) px(s, fx, cxp + dx + (t > h - 3 ? (dx > 0 ? 1 : -1) : 0), baseY - t, col);
    px(s, fx, cxp + dx, baseY - h, C.leafLine);
  }
}
function drawLilypad(s, fx) {
  const cxp = 16, baseY = 22;
  blob(s, fx, cxp, baseY, 8, 4.5, C.padTop, C.padDk);
  ellipse(s, fx, cxp - 1.5, baseY - 1, 4.5, 2.4, C.padRim);
  // Wedge notch.
  tri(s, fx, cxp + 2, baseY, cxp + 9, baseY - 3, cxp + 9, baseY + 3, [0, 0, 0, 0]);
  tri(s, fx, cxp + 2, baseY, cxp + 8.5, baseY - 2.4, cxp + 8.5, baseY + 2.4, C.padDk);
  ellipse(s, fx, cxp - 4, baseY - 2, 1, 1, C.pink); // tiny bloom
}

// ── Build all ───────────────────────────────────────────────────────
const sheets = {};
sheets.tree = writeSheet('tree', TREE_STAGES.length, (s, fx, i) => drawTree(s, fx, TREE_STAGES[i]));
sheets.rock = writeSheet('rock', ROCK_SIZES.length, (s, fx, i) => drawRock(s, fx, ROCK_SIZES[i]));
const FLOWERS = { white: [hex(0xf4f0e8), hex(0xcfc7b6)], pink: [hex(0xf29ac0), hex(0xcf6f9a)], yellow: [hex(0xf6d24a), hex(0xcfa42f)], blue: [hex(0x7db0ec), hex(0x5386c4)] };
for (const [name, [p, e]] of Object.entries(FLOWERS)) sheets[`flower_${name}`] = writeSheet(`flower_${name}`, 1, drawFlower(p, e));
sheets.bush = writeSheet('bush', 1, drawBush);
sheets.fern = writeSheet('fern', 1, drawFern);
sheets.tall_grass = writeSheet('tall_grass', 1, drawTallGrass);
sheets.lilypad = writeSheet('lilypad', 1, drawLilypad);
console.log(`wrote ${Object.keys(sheets).length} world sheets to ${outDir}`);

// ── Optional contact sheet ──────────────────────────────────────────
const previewPath = process.argv[2];
if (previewPath) {
  const ids = Object.keys(sheets);
  const S = 7, cols = 3;
  const cellW = FW * S, cellH = FH * S;
  const big = createSheet(0); big.W = cellW * cols; big.H = cellH * ids.length; big.buf = new Uint8Array(big.W * big.H * 4);
  ids.forEach((id, row) => { const src = sheets[id];
    for (let y = 0; y < src.H; y++) for (let x = 0; x < Math.min(src.W, cellW / S * cols); x++) {
      const si = (y * src.W + x) * 4; let r = src.buf[si], g = src.buf[si + 1], b = src.buf[si + 2], a = src.buf[si + 3];
      if (a === 0) { const c = ((x >> 2) + (y >> 2)) % 2 ? 55 : 38; r = g = b = c; a = 255; }
      for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) { const gx = x * S + sx, gy = row * cellH + y * S + sy; if (gx >= big.W) continue; const di = (gy * big.W + gx) * 4; big.buf[di] = r; big.buf[di + 1] = g; big.buf[di + 2] = b; big.buf[di + 3] = a; } }
  });
  mkdirSync(dirname(previewPath), { recursive: true }); writeFileSync(previewPath, encodePNG(big));
  console.log(`wrote contact sheet ${previewPath}`);
}
