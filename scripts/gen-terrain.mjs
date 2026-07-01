// Generates the terrain spritesheets into public/assets/.
//
//   node scripts/gen-terrain.mjs [contactPreview.png]
//
// Isometric terrain art for the Bloom island redesign (Phase C+). The engine's
// pixel toolkit (scripts/lib/pixel.mjs) is locked to 32x32 frames, so this script
// defines its own 40x20-capable raw-buffer primitives and reuses only encodePNG.
//
// Frame geometry matches PixiRenderer's iso poly (islandConfig: tileW=40, tileH=20,
// sideH=10 -> HW=20, HH=10):
//   • Tile tops / water / shoreline: 40x20 diamond, CENTRED (renderer anchor 0.5,0.5 at tile centre).
//   • Cliff walls: 20x20 parallelogram, anchored top-left at the wall's screen origin.
//   • Corners: 40x24 overlay, centred, softens the outer silhouette vertex.
// Every sheet degrades to the renderer's existing primitive if the PNG is absent.
//
// Frame ids ARE the variant strings the renderer computes (same convention as
// tree stage / rock size), so the AssetRegistry resolves them generically.

import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { encodePNG } from './lib/pixel.mjs';

const outDir = fileURLToPath(new URL('../public/assets', import.meta.url));
const hex = (n) => [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff, 255];
const rgba = (n, a) => [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff, a];
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => [
  Math.round(lerp(c1[0], c2[0], t)),
  Math.round(lerp(c1[1], c2[1], t)),
  Math.round(lerp(c1[2], c2[2], t)),
  255,
];
// Deterministic LCG so regenerated PNGs are byte-stable (clean diffs).
const lcg = (seed) => {
  let s = (seed >>> 0) || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0), s / 4294967296);
};

// ── Palette (cohesive with gen-world.mjs / the retuned TilePalette) ──
const C = {
  grass: hex(0x63a63f), grassLt: hex(0x7cbb4e), grassDk: hex(0x4f8a2f), blade: hex(0x3f7a25),
  dirt: hex(0xb5895a), dirtLt: hex(0xc79b6c), dirtDk: hex(0x9a7043), pebble: hex(0x8f8375),
  water: hex(0x59a3d8), waterLt: hex(0x86c8ef), waterDk: hex(0x3f83bb), foam: hex(0xcaeaf6),
  wallL: hex(0x8a5e34), wallLdk: hex(0x6e4a28), wallR: hex(0x5f3d1e), wallRdk: hex(0x492e16),
  root: hex(0x4e3417), stone: hex(0x9a9ea5), stoneLt: hex(0xc2c6cc), moss: hex(0x5a9a3f), mossLt: hex(0x77b955),
};

// ── Raw-buffer sheet + primitives (40x20-capable, unlike pixel.mjs) ──
function mksheet(fw, fh, n) {
  return { W: fw * n, H: fh, fw, fh, n, buf: new Uint8Array(fw * n * fh * 4) };
}
function pset(s, fx, x, y, col) {
  const ix = Math.round(x), iy = Math.round(y);
  if (ix < 0 || ix >= s.fw || iy < 0 || iy >= s.fh) return; // clip to frame
  const gx = fx + ix;
  const i = (iy * s.W + gx) * 4;
  const a = col[3] ?? 255;
  if (a === 0) return;
  if (a < 255) {
    // alpha-over the existing pixel (shoreline foam / soft edges)
    const ba = s.buf[i + 3];
    const t = a / 255;
    s.buf[i] = Math.round(lerp(s.buf[i], col[0], t));
    s.buf[i + 1] = Math.round(lerp(s.buf[i + 1], col[1], t));
    s.buf[i + 2] = Math.round(lerp(s.buf[i + 2], col[2], t));
    s.buf[i + 3] = Math.max(ba, a);
    return;
  }
  s.buf[i] = col[0]; s.buf[i + 1] = col[1]; s.buf[i + 2] = col[2]; s.buf[i + 3] = 255;
}
// Diamond centred in a fw x fh frame. Returns the mask value m at (x,y):
// m<=1 is inside; m near 1 is the rim. cx=fw/2, cy=fh/2, hw=fw/2, hh=fh/2.
function diamondM(s, x, y) {
  const cx = s.fw / 2, cy = s.fh / 2;
  return Math.abs(x - cx) / (s.fw / 2) + Math.abs(y - cy) / (s.fh / 2);
}

// Fill the iso diamond with base colour + vertical light gradient + speckle noise
// + a slightly darker rim for readability.
function diamondTile(s, fx, base, lt, dk, speck, speckCol, seed) {
  const rnd = lcg(seed);
  const cy = s.fh / 2;
  for (let y = 0; y < s.fh; y++) {
    for (let x = 0; x < s.fw; x++) {
      const m = diamondM(s, x, y);
      if (m > 1) continue;
      // top of the diamond a touch lighter, bottom a touch darker (soft sun).
      const g = (y - cy) / s.fh; // -0.5 top .. +0.5 bottom
      let col = g < 0 ? mix(base, lt, -g * 0.9) : mix(base, dk, g * 0.9);
      const r = rnd();
      if (r < speck) col = speckCol;
      else if (r < speck * 1.7) col = mix(col, dk, 0.5);
      if (m > 0.9) col = mix(col, dk, 0.55); // darker rim
      pset(s, fx, x, y, col);
    }
  }
}

// ── Grass (6) / Dirt (4) tile tops ──────────────────────────────────
function buildGrass() {
  const s = mksheet(40, 20, 6);
  for (let i = 0; i < 6; i++) {
    diamondTile(s, i * 40, C.grass, C.grassLt, C.grassDk, 0.06 + i * 0.015, C.blade, 0x51a1 + i * 977);
    // a few standing blade flecks for variety
    const rnd = lcg(0x9e37 + i * 131);
    const blades = 2 + (i % 3);
    for (let b = 0; b < blades; b++) {
      const bx = 8 + Math.floor(rnd() * 24), by = 8 + Math.floor(rnd() * 6);
      if (diamondM(s, bx, by) > 0.85) continue;
      pset(s, i * 40, bx, by, C.grassLt);
      pset(s, i * 40, bx, by - 1, C.blade);
    }
  }
  return s;
}
function buildDirt() {
  const s = mksheet(40, 20, 4);
  for (let i = 0; i < 4; i++) {
    diamondTile(s, i * 40, C.dirt, C.dirtLt, C.dirtDk, 0.05 + i * 0.02, C.dirtDk, 0x1d37 + i * 613);
    // scattered pebbles
    const rnd = lcg(0x4c2f + i * 271);
    const pebbles = 1 + (i % 3);
    for (let p = 0; p < pebbles; p++) {
      const px2 = 8 + Math.floor(rnd() * 24), py = 7 + Math.floor(rnd() * 6);
      if (diamondM(s, px2, py) > 0.8) continue;
      pset(s, i * 40, px2, py, C.pebble);
      pset(s, i * 40, px2 + 1, py, mix(C.pebble, C.dirtDk, 0.4));
      pset(s, i * 40, px2, py + 1, mix(C.pebble, C.dirtDk, 0.5));
    }
  }
  return s;
}

// ── Water (4 ripple frames) ─────────────────────────────────────────
function buildWater() {
  const s = mksheet(40, 20, 4);
  const cy = s.fh / 2;
  for (let i = 0; i < 4; i++) {
    const phase = i * 3;
    for (let y = 0; y < s.fh; y++) {
      for (let x = 0; x < s.fw; x++) {
        const m = diamondM(s, x, y);
        if (m > 1) continue;
        const g = (y - cy) / s.fh;
        let col = g < 0 ? mix(C.water, C.waterLt, -g * 0.5) : mix(C.water, C.waterDk, g * 0.7);
        // diagonal moving ripple highlight bands
        const band = (x + y * 2 + phase) % 12;
        if (band < 2) col = mix(col, C.waterLt, 0.6);
        else if (band === 6) col = mix(col, C.waterDk, 0.4);
        if (m > 0.92) col = mix(col, C.waterDk, 0.5);
        pset(s, i * 40, x, y, col);
      }
    }
    // a couple of drifting sparkles per frame
    const sx = 12 + ((i * 7) % 16), sy = 7 + (i % 5);
    pset(s, i * 40, sx, sy, C.foam);
    pset(s, i * 40, 40 - sx, sy + 2, mix(C.waterLt, C.foam, 0.5));
  }
  return s;
}

// ── Shoreline (8 land-facing foam overlays, transparent base) ───────
// Quadrant edges: ne (x>=cx,y<=cy), se (x>=cx,y>=cy), sw (x<=cx,y>=cy), nw (x<=cx,y<=cy).
const SHORE_IDS = ['e_ne', 'e_se', 'e_sw', 'e_nw', 'e_n', 'e_e', 'e_s', 'e_w'];
const SHORE_EDGES = {
  e_ne: ['ne'], e_se: ['se'], e_sw: ['sw'], e_nw: ['nw'],
  e_n: ['ne', 'nw'], e_e: ['ne', 'se'], e_s: ['se', 'sw'], e_w: ['sw', 'nw'],
};
function quadM(s, x, y, edge) {
  const cx = s.fw / 2, cy = s.fh / 2;
  const inQuad =
    (edge === 'ne' && x >= cx && y <= cy) || (edge === 'se' && x >= cx && y >= cy) ||
    (edge === 'sw' && x <= cx && y >= cy) || (edge === 'nw' && x <= cx && y <= cy);
  if (!inQuad) return -1;
  return Math.abs(x - cx) / (s.fw / 2) + Math.abs(y - cy) / (s.fh / 2);
}
function buildShoreline() {
  const s = mksheet(40, 20, SHORE_IDS.length);
  SHORE_IDS.forEach((id, i) => {
    const edges = SHORE_EDGES[id];
    for (let y = 0; y < s.fh; y++) {
      for (let x = 0; x < s.fw; x++) {
        if (diamondM(s, x, y) > 1) continue;
        let best = -1;
        for (const e of edges) { const m = quadM(s, x, y, e); if (m > best) best = m; }
        if (best < 0.5) continue; // only near the land-facing rim
        const t = (best - 0.5) / 0.5; // 0 inner .. 1 rim
        const col = mix(C.waterLt, C.foam, t);
        pset(s, i * 40, x, y, [col[0], col[1], col[2], Math.round(60 + 150 * t)]);
      }
    }
  });
  return s;
}

// Cliff faces are no longer per-tile sprites — the renderer draws the island's
// perimeter as two continuous solid skirt polygons (a solid floating landmass),
// with procedural dirt shading + sparse rocks/roots/moss. See PixiRenderer.drawCliffs.

// ── Corner rounding overlays (4: n/e/s/w silhouette vertices) ───────
// 40x24 frame, centred at tile centre (cy=12 -> covers a little below the lip).
// Additive: soft lighter grass rim beveling the two outer edges at that vertex.
const CORNER_IDS = ['n', 'e', 's', 'w'];
function buildCorners() {
  const fh = 24;
  const s = mksheet(40, fh, CORNER_IDS.length);
  const cx = 20, cy = 10; // diamond centre within the 40x24 frame (top-aligned like the tile)
  const edgesFor = { n: ['ne', 'nw'], e: ['ne', 'se'], s: ['se', 'sw'], w: ['sw', 'nw'] };
  CORNER_IDS.forEach((id, i) => {
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < 40; x++) {
        const m = Math.abs(x - cx) / 20 + Math.abs(y - cy) / 20;
        if (m > 1 || m < 0.7) continue;
        // only the two edges that meet at this vertex
        const q = [];
        if (x >= cx && y <= cy) q.push('ne');
        if (x >= cx && y >= cy) q.push('se');
        if (x <= cx && y >= cy) q.push('sw');
        if (x <= cx && y <= cy) q.push('nw');
        if (!q.some((e) => edgesFor[id].includes(e))) continue;
        const t = (m - 0.7) / 0.3;
        const col = mix(C.grassLt, C.grass, 1 - t);
        pset(s, i * 40, x, y, [col[0], col[1], col[2], Math.round(90 * t)]);
      }
    }
  });
  return s;
}

// ── Build all ───────────────────────────────────────────────────────
function write(name, s) {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(`${outDir}/${name}.png`, encodePNG(s));
  return s;
}
const sheets = {};
sheets.terrain_grass = write('terrain_grass', buildGrass());
sheets.terrain_dirt = write('terrain_dirt', buildDirt());
sheets.water = write('water', buildWater());
sheets.shoreline = write('shoreline', buildShoreline());
sheets.corners = write('corners', buildCorners());
console.log(`wrote ${Object.keys(sheets).length} terrain sheets to ${outDir}`);

// ── Optional contact sheet (checkerboard behind transparency) ───────
const previewPath = process.argv[2];
if (previewPath) {
  const S = 6;
  const rows = Object.entries(sheets);
  const cellH = 24 * S;
  const big = { W: 40 * 8 * S, H: cellH * rows.length, buf: null };
  big.buf = new Uint8Array(big.W * big.H * 4);
  rows.forEach(([, src], row) => {
    for (let y = 0; y < src.H; y++) {
      for (let x = 0; x < src.W; x++) {
        const si = (y * src.W + x) * 4;
        let r = src.buf[si], g = src.buf[si + 1], b = src.buf[si + 2], a = src.buf[si + 3];
        if (a === 0) { const c = ((x >> 2) + (y >> 2)) % 2 ? 55 : 38; r = g = b = c; a = 255; }
        for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
          const gx = x * S + sx, gy = row * cellH + y * S + sy;
          if (gx >= big.W || gy >= big.H) continue;
          const di = (gy * big.W + gx) * 4;
          big.buf[di] = r; big.buf[di + 1] = g; big.buf[di + 2] = b; big.buf[di + 3] = 255;
        }
      }
    }
  });
  mkdirSync(dirname(previewPath), { recursive: true });
  writeFileSync(previewPath, encodePNG(big));
  console.log(`wrote contact sheet ${previewPath}`);
}
