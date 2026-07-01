// Tiny dependency-free pixel-art + PNG toolkit shared by the sprite generators.
// A "sheet" is a horizontal strip of 32x32 frames drawn into an RGBA buffer and
// encoded to PNG with Node's zlib. Frame order is fixed for every animal so the
// content packs can slice by column index.

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const FW = 32; // frame width
export const FH = 32; // frame height

// MUST match ANIMAL_FRAME_ORDER in src/assets/animalSprite.ts.
export const FRAME_ORDER = ['idle_0', 'idle_1', 'walk_0', 'walk_1', 'walk_2', 'walk_3', 'sleep_0'];

export function createSheet(nFrames) {
  const W = FW * nFrames;
  return { W, H: FH, n: nFrames, buf: new Uint8Array(W * FH * 4) };
}

export function px(s, fx, x, y, rgba) {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix < 0 || ix >= FW || iy < 0 || iy >= FH) return; // clip to the frame
  const gx = fx + ix;
  if (gx < 0 || gx >= s.W) return;
  const i = (iy * s.W + gx) * 4;
  s.buf[i] = rgba[0];
  s.buf[i + 1] = rgba[1];
  s.buf[i + 2] = rgba[2];
  s.buf[i + 3] = rgba[3] ?? 255;
}

export function rect(s, fx, x0, y0, w, h, rgba) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) px(s, fx, x, y, rgba);
}

export function ellipse(s, fx, cx, cy, rx, ry, rgba) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) px(s, fx, x, y, rgba);
    }
  }
}

// Filled ellipse with a 1px darker outline: draw an expanded outline blob first,
// then the fill on top. Gives every part a clean readable silhouette.
export function blob(s, fx, cx, cy, rx, ry, fill, line) {
  ellipse(s, fx, cx, cy, rx + 1, ry + 1, line);
  ellipse(s, fx, cx, cy, rx, ry, fill);
}

// A filled triangle (used for ears, antlers, beaks, spikes). Points in frame px.
export function tri(s, fx, ax, ay, bx, by, cx, cy, rgba) {
  const minX = Math.floor(Math.min(ax, bx, cx));
  const maxX = Math.ceil(Math.max(ax, bx, cx));
  const minY = Math.floor(Math.min(ay, by, cy));
  const maxY = Math.ceil(Math.max(ay, by, cy));
  const area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
  if (area === 0) return;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const w0 = ((bx - ax) * (y - ay) - (by - ay) * (x - ax)) / area;
      const w1 = ((cx - bx) * (y - by) - (cy - by) * (x - bx)) / area;
      const w2 = 1 - w0 - w1;
      if (w0 >= 0 && w1 >= 0 && w2 >= 0) px(s, fx, x, y, rgba);
    }
  }
}

// ── PNG encode ──────────────────────────────────────────────────────
function crc32(bytes) {
  let c = ~0;
  for (let n = 0; n < bytes.length; n++) {
    c ^= bytes[n];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

export function encodePNG(s) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(s.W, 0);
  ihdr.writeUInt32BE(s.H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  const raw = Buffer.alloc(s.H * (1 + s.W * 4));
  for (let y = 0; y < s.H; y++) {
    const rowStart = y * (1 + s.W * 4);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < s.W * 4; x++) raw[rowStart + 1 + x] = s.buf[y * s.W * 4 + x];
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

export function writePNG(path, s) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, encodePNG(s));
}

// Draw every frame of an animal by name into a fresh sheet and return it.
// `draw(sheet, fx, frameName)` renders one frame at horizontal offset `fx`.
export function buildAnimal(draw) {
  const s = createSheet(FRAME_ORDER.length);
  FRAME_ORDER.forEach((name, i) => draw(s, i * FW, name));
  return s;
}
