// Generates public/assets/rabbit.png — the rabbit spritesheet.
//
// No dependencies: builds an RGBA framebuffer procedurally and encodes a PNG
// with Node's zlib. Re-run to regenerate/edit the art:
//   node scripts/gen-rabbit-sheet.mjs
//
// Layout: 32x32 frames, horizontal strip. Frame order MUST match rabbit.pack.ts:
//   idle_0 idle_1 | walk_0 walk_1 walk_2 walk_3 | sleep_0
// Rabbit faces east (right). Bottom-centre of each frame is the tile anchor.

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const FW = 32; // frame width
const FH = 32; // frame height
const FRAMES = ['idle_0', 'idle_1', 'walk_0', 'walk_1', 'walk_2', 'walk_3', 'sleep_0'];
const SW = FW * FRAMES.length; // sheet width
const SH = FH;

// ── Palette (RGBA) ──────────────────────────────────────────────────
const C = {
  body: [0xd8, 0xcf, 0xc0, 0xff], // cream
  belly: [0xb8, 0xae, 0x9c, 0xff], // shadow / underside
  line: [0x5a, 0x51, 0x48, 0xff], // outline + eye
  pink: [0xe8, 0xa0, 0xa8, 0xff], // inner ear + nose
  hi: [0xf0, 0xeb, 0xe2, 0xff], // highlight + tail
};

// ── Framebuffer ─────────────────────────────────────────────────────
const buf = new Uint8Array(SW * SH * 4); // all zero → transparent

function px(fx, x, y, rgba) {
  const gx = fx + x;
  if (x < 0 || x >= FW || y < 0 || y >= FH || gx < 0 || gx >= SW) return;
  const i = (y * SW + gx) * 4;
  buf[i] = rgba[0];
  buf[i + 1] = rgba[1];
  buf[i + 2] = rgba[2];
  buf[i + 3] = rgba[3];
}

function ellipse(fx, cx, cy, rx, ry, rgba) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) px(fx, x, y, rgba);
    }
  }
}

function rect(fx, x0, y0, w, h, rgba) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) px(fx, x, y, rgba);
}

// A filled shape with a 1px darker outline: draw an expanded outline blob, then
// the fill on top.
function ellipseOutlined(fx, cx, cy, rx, ry, fill) {
  ellipse(fx, cx, cy, rx + 1, ry + 1, C.line);
  ellipse(fx, cx, cy, rx, ry, fill);
}

// ── Rabbit ──────────────────────────────────────────────────────────
// legLift: per-frame front/back foot vertical offset for the walk cycle.
// bob:     whole-body vertical bob.
// earShift: horizontal ear sway.
function drawRabbit(fx, { bob = 0, frontLift = 0, backLift = 0, earShift = 0, nose = 0 }) {
  const by = 20 - bob; // body centre y

  // Tail (behind body, left/back).
  ellipseOutlined(fx, 7, by, 2, 2, C.hi);

  // Feet (drawn before body so body overlaps their tops).
  ellipse(fx, 19, 28 - frontLift, 2.4, 1.4, C.belly); // front foot
  ellipse(fx, 11, 28 - backLift, 2.6, 1.6, C.belly); // back foot

  // Body.
  ellipseOutlined(fx, 14, by, 7, 6, C.body);
  // Belly shadow (lower third).
  ellipse(fx, 14, by + 3, 6, 2.5, C.belly);
  // Back highlight.
  ellipse(fx, 11, by - 3, 2.5, 1.5, C.hi);

  // Ears (rise from the head; inner pink).
  const ex = earShift;
  ellipseOutlined(fx, 20 + ex, 9, 1.6, 5, C.body);
  ellipse(fx, 20 + ex, 9, 0.7, 4, C.pink);
  ellipseOutlined(fx, 23 - ex, 8, 1.6, 5, C.body);
  ellipse(fx, 23 - ex, 8, 0.7, 4, C.pink);

  // Head (front/right, overlaps ears' base).
  ellipseOutlined(fx, 22, 15 - bob, 4, 4, C.body);

  // Eye (solid 2x2) + nose (tight 1x2 blob on the snout).
  rect(fx, 22, 14 - bob, 2, 2, C.line);
  rect(fx, 25 + nose, 16 - bob, 1, 2, C.pink);
}

function drawSleep(fx) {
  // Curled, low to the ground, ears laid back, eye closed.
  ellipse(fx, 12, 27, 3, 1.4, C.belly); // ground shadow

  // Long low body.
  ellipseOutlined(fx, 15, 25, 9, 4, C.body);
  ellipse(fx, 15, 26.5, 8, 2, C.belly); // belly shadow
  ellipse(fx, 10, 23, 3, 1.4, C.hi); // back highlight

  // Ears laid back along the body.
  ellipseOutlined(fx, 8, 22, 4, 1.4, C.body);
  ellipse(fx, 8, 22, 3, 0.7, C.pink);

  // Tucked head at the front.
  ellipseOutlined(fx, 23, 25, 3.5, 3, C.body);
  // Closed eye — a short dark line.
  rect(fx, 23, 25, 2, 1, C.line);
  ellipse(fx, 26, 26, 1, 1, C.pink); // nose
}

// ── Compose frames ──────────────────────────────────────────────────
const POSES = {
  idle_0: (fx) => drawRabbit(fx, { bob: 0, earShift: 0, nose: 0 }),
  idle_1: (fx) => drawRabbit(fx, { bob: 1, earShift: 0, nose: 1 }), // subtle breathe + nose twitch
  walk_0: (fx) => drawRabbit(fx, { bob: 0, frontLift: 2, backLift: 0, earShift: 1 }),
  walk_1: (fx) => drawRabbit(fx, { bob: 1, frontLift: 0, backLift: 0, earShift: 0 }),
  walk_2: (fx) => drawRabbit(fx, { bob: 0, frontLift: 0, backLift: 2, earShift: -1 }),
  walk_3: (fx) => drawRabbit(fx, { bob: 1, frontLift: 0, backLift: 0, earShift: 0 }),
  sleep_0: (fx) => drawSleep(fx),
};

FRAMES.forEach((name, i) => POSES[name](i * FW));

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
  const typeBytes = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBytes, data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SW, 0);
ihdr.writeUInt32BE(SH, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // colour type RGBA
ihdr[10] = 0; // compression
ihdr[11] = 0; // filter
ihdr[12] = 0; // interlace

// Raw scanlines: 1 filter byte (0 = none) + RGBA row.
const raw = Buffer.alloc(SH * (1 + SW * 4));
for (let y = 0; y < SH; y++) {
  const rowStart = y * (1 + SW * 4);
  raw[rowStart] = 0;
  for (let x = 0; x < SW * 4; x++) raw[rowStart + 1 + x] = buf[y * SW * 4 + x];
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const outDir = fileURLToPath(new URL('../public/assets', import.meta.url));
mkdirSync(outDir, { recursive: true });
const outPath = `${outDir}/rabbit.png`;
writeFileSync(outPath, png);
console.log(`wrote ${outPath} (${SW}x${SH}, ${FRAMES.length} frames, ${png.length} bytes)`);
