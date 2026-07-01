// Generates every animal spritesheet into public/assets/<species>.png.
//
//   node scripts/gen-sheets.mjs [contactPreview.png]
//
// One shared pixel-art style (scripts/lib/pixel.mjs). Every sheet is a 32x32
// horizontal strip, 7 frames, bottom-centre origin, facing east:
//   idle_0 idle_1 | walk_0 walk_1 walk_2 walk_3 | sleep_0
// Goal: readable real-animal silhouettes, small + adorable, minimal palette.
// Frame order MUST match src/assets/animalSprite.ts (ANIMAL_FRAME_ORDER).

import { fileURLToPath } from 'node:url';
import { px, rect, ellipse, blob, tri, buildAnimal, writePNG, createSheet, encodePNG } from './lib/pixel.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const hex = (n) => [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff, 255];

// ── Per-frame animation params (shared per movement template) ───────
const QUAD = {
  idle_0: {}, idle_1: { bob: 1, breath: 1 },
  walk_0: { frontLift: 2, backLift: 0, gait: 1 }, walk_1: { bob: 1 },
  walk_2: { frontLift: 0, backLift: 2, gait: -1 }, walk_3: { bob: 1 },
};
const BIRD = {
  idle_0: { wing: 0 }, idle_1: { wing: 0, bob: 1 },
  walk_0: { wing: 1, step: 1 }, walk_1: { wing: 2, bob: 1 },
  walk_2: { wing: 1, step: -1 }, walk_3: { wing: 0, bob: 1 },
};
const INSECT = { idle_0: { wing: 1 }, idle_1: { wing: 0 }, walk_0: { wing: 2 }, walk_1: { wing: 1 }, walk_2: { wing: 0 }, walk_3: { wing: 1 } };
const FROG = { idle_0: { hop: 0 }, idle_1: { hop: 0, breath: 1 }, walk_0: { hop: 0, crouch: 1 }, walk_1: { hop: 3 }, walk_2: { hop: 5 }, walk_3: { hop: 2 } };

// ── Shared part helpers ─────────────────────────────────────────────
// A leg: vertical limb from topY, `lift` raises the foot for the walk cycle.
function leg(s, fx, x, topY, len, lift, w, col) {
  const h = Math.max(1, len - lift);
  rect(s, fx, Math.round(x - (w - 1) / 2), Math.round(topY), w, Math.round(h), col);
  ellipse(s, fx, x, topY + h, w * 0.6 + 0.5, 0.9, col); // paw
}
// Muzzled head: skull + forward snout + eye + nose. Returns nothing.
function muzzleHead(s, fx, hx, hy, r, muzLen, muzH, body, line, nose, eyeDx = 0) {
  ellipse(s, fx, hx + r * 0.55, hy + r * 0.35, muzLen, muzH, body); // snout base
  blob(s, fx, hx, hy, r, r, body, line);
  ellipse(s, fx, hx + r * 0.55, hy + r * 0.35, muzLen, muzH, body); // snout over outline
  const nx = hx + r * 0.55 + muzLen - 0.5;
  ellipse(s, fx, nx, hy + r * 0.35, 1, 0.9, nose); // nose tip
  rect(s, fx, Math.round(hx + eyeDx), Math.round(hy - 0.5), 2, 2, line); // eye
}

// ════════════════════════════════════════════════════════════════════
// Generic side-view mammal: haunch + body + shoulder, 4 legs, neck, muzzled
// head, ears, tail. Config tunes palette/proportions and part drawers.
// ════════════════════════════════════════════════════════════════════
function mammal(C) {
  const leftBackX = C.cx - C.bodyRx * 0.7;
  const rightBackX = C.cx - C.bodyRx * 0.35;
  const leftFrontX = C.cx + C.bodyRx * 0.45;
  const rightFrontX = C.cx + C.bodyRx * 0.75;
  return (s, fx, name) => {
    if (name === 'sleep_0') return mammalSleep(s, fx, C);
    const p = QUAD[name];
    const bob = p.bob || 0, fl = p.frontLift || 0, bl = p.backLift || 0, es = p.earShift || 0;
    const by = C.by - bob;
    const legTop = by + C.bodyRy * 0.4;

    if (C.tail) C.tail(s, fx, by, C);

    // Far legs (behind the body): back-left + front-left, lightly shaded.
    leg(s, fx, leftBackX, legTop, C.legLen, bl, C.legW, C.legDk || C.foot);
    leg(s, fx, leftFrontX, legTop, C.legLen, fl, C.legW, C.legDk || C.foot);

    // Haunch (rear thigh) + barrel body + shoulder.
    blob(s, fx, C.cx - C.bodyRx * 0.55, by + 0.5, C.bodyRx * 0.5, C.bodyRy * 0.85, C.body, C.line);
    blob(s, fx, C.cx, by, C.bodyRx, C.bodyRy, C.body, C.line);
    ellipse(s, fx, C.cx, by + C.bodyRy * 0.45, C.bodyRx - 1, C.bodyRy * 0.5, C.belly);
    ellipse(s, fx, C.cx - C.bodyRx * 0.4, by - C.bodyRy * 0.55, C.bodyRx * 0.4, C.bodyRy * 0.3, C.hi);

    // Near legs (in front of the body).
    leg(s, fx, rightBackX, legTop, C.legLen, bl ? 0 : Math.max(0, fl - 1), C.legW, C.foot);
    leg(s, fx, rightFrontX, legTop, C.legLen, fl, C.legW, C.foot);

    // Neck bridging shoulder → head.
    const hx = C.headCX, hy = C.headCY - bob;
    ellipse(s, fx, (rightFrontX + hx) / 2, (by - C.bodyRy * 0.4 + hy) / 2, C.neckW || 2.2, (by - hy) * 0.5 + 1.4, C.body);

    if (C.ears) C.ears(s, fx, hx, hy, es, C);
    muzzleHead(s, fx, hx, hy, C.headR, C.muzLen, C.muzH, C.body, C.line, C.nose, C.headR - 1.5);
    if (C.extra) C.extra(s, fx, by, p, C, hx, hy);
  };
}

function mammalSleep(s, fx, C) {
  ellipse(s, fx, 15, 29, C.bodyRx + 1, 1.5, C.belly); // ground shadow
  const ry = Math.max(3.4, C.bodyRy - 1.5);
  blob(s, fx, 14, 27 - ry * 0.4, C.bodyRx + 1.5, ry, C.body, C.line); // curled body
  ellipse(s, fx, 14, 28 - ry * 0.2, C.bodyRx, ry * 0.5, C.belly);
  ellipse(s, fx, 9, 25, C.bodyRx * 0.4, 1.3, C.hi);
  // Head resting at the front.
  blob(s, fx, 22, 27 - ry * 0.2, C.headR - 0.3, C.headR - 0.6, C.body, C.line);
  ellipse(s, fx, 24, 27 - ry * 0.2 + 0.4, C.muzLen, C.muzH, C.body);
  rect(s, fx, 21, Math.round(27 - ry * 0.2 - 0.5), 2, 1, C.line); // closed eye
  if (C.sleepExtra) C.sleepExtra(s, fx, C);
}

// ── Ear drawers ─────────────────────────────────────────────────────
const pointyEars = (col, inner, line) => (s, fx, hx, hy, es) => {
  tri(s, fx, hx - 2.5 + es, hy - 1, hx - 1.5 + es, hy - 6, hx + 0.5 + es, hy - 2, line);
  tri(s, fx, hx + 1 - es, hy - 2, hx + 2.5 - es, hy - 6, hx + 3.5 - es, hy - 1, line);
  tri(s, fx, hx - 1.8 + es, hy - 1.5, hx - 1.2 + es, hy - 5, hx + 0.2 + es, hy - 2.2, inner);
  tri(s, fx, hx + 1.6 - es, hy - 2, hx + 2.5 - es, hy - 5, hx + 3 - es, hy - 1.6, inner);
};
const roundEars = (col, inner, line) => (s, fx, hx, hy) => {
  blob(s, fx, hx - 1.5, hy - 3.5, 1.8, 1.8, col, line);
  blob(s, fx, hx + 2.5, hy - 3.8, 1.8, 1.8, col, line);
  ellipse(s, fx, hx - 1.5, hy - 3.3, 0.9, 0.9, inner);
  ellipse(s, fx, hx + 2.5, hy - 3.6, 0.9, 0.9, inner);
};
const tuftEars = (col, line) => (s, fx, hx, hy) => {
  tri(s, fx, hx - 1.5, hy - 2, hx - 1, hy - 5, hx + 0.3, hy - 2.5, col);
  tri(s, fx, hx + 2, hy - 2.3, hx + 2.5, hy - 5, hx + 3.3, hy - 2.2, col);
};

// ════════════════════════════════════════════════════════════════════
// Rabbit — ported verbatim from the approved reference art.
// ════════════════════════════════════════════════════════════════════
function drawRabbit(s, fx, name) {
  const C = { body: hex(0xd8cfc0), belly: hex(0xb8ae9c), line: hex(0x5a5148), pink: hex(0xe8a0a8), hi: hex(0xf0ebe2) };
  if (name === 'sleep_0') {
    ellipse(s, fx, 12, 27, 3, 1.4, C.belly); blob(s, fx, 15, 25, 9, 4, C.body, C.line);
    ellipse(s, fx, 15, 26.5, 8, 2, C.belly); ellipse(s, fx, 10, 23, 3, 1.4, C.hi);
    blob(s, fx, 8, 22, 4, 1.4, C.body, C.line); ellipse(s, fx, 8, 22, 3, 0.7, C.pink);
    blob(s, fx, 23, 25, 3.5, 3, C.body, C.line); rect(s, fx, 23, 25, 2, 1, C.line); ellipse(s, fx, 26, 26, 1, 1, C.pink);
    return;
  }
  const p = QUAD[name];
  const bob = p.bob || 0, fl = p.frontLift || 0, bl = p.backLift || 0, es = p.gait || 0, nz = p.breath || 0;
  const by = 20 - bob;
  blob(s, fx, 7, by, 2, 2, C.hi, C.line);
  ellipse(s, fx, 19, 28 - fl, 2.4, 1.4, C.belly); ellipse(s, fx, 11, 28 - bl, 2.6, 1.6, C.belly);
  blob(s, fx, 14, by, 7, 6, C.body, C.line); ellipse(s, fx, 14, by + 3, 6, 2.5, C.belly); ellipse(s, fx, 11, by - 3, 2.5, 1.5, C.hi);
  blob(s, fx, 20 + es, 9, 1.6, 5, C.body, C.line); ellipse(s, fx, 20 + es, 9, 0.7, 4, C.pink);
  blob(s, fx, 23 - es, 8, 1.6, 5, C.body, C.line); ellipse(s, fx, 23 - es, 8, 0.7, 4, C.pink);
  blob(s, fx, 22, 15 - bob, 4, 4, C.body, C.line); rect(s, fx, 22, 14 - bob, 2, 2, C.line); rect(s, fx, 25 + nz, 16 - bob, 1, 2, C.pink);
}

// ════════════════════════════════════════════════════════════════════
// Squirrel — upright sitting pose, huge curled tail, little paws.
// ════════════════════════════════════════════════════════════════════
function drawSquirrel(s, fx, name) {
  const C = { body: hex(0xa5673a), belly: hex(0xe6c79a), hi: hex(0xc08a52), line: hex(0x532f16), ear: hex(0xa5673a) };
  const sleep = name === 'sleep_0';
  const p = sleep ? null : QUAD[name];
  const bob = p ? (p.bob || 0) : 0;
  const base = sleep ? 5 : 0; // curl down when sleeping
  const by = 22 - bob + base;
  // Big bushy tail arcing up the back.
  if (!sleep) {
    blob(s, fx, 8, by - 4, 4, 6, C.body, C.line);
    ellipse(s, fx, 7, by - 6, 2.5, 4, C.hi);
    ellipse(s, fx, 9, by + 2, 2.5, 3, C.body);
  } else {
    blob(s, fx, 9, 26, 4.5, 2.5, C.body, C.line); ellipse(s, fx, 8, 25.5, 3, 1.4, C.hi);
  }
  // Feet.
  ellipse(s, fx, 16, 30, 2, 1.2, C.line); ellipse(s, fx, 12, 30, 2, 1.2, C.line);
  // Upright body (pear-shaped).
  blob(s, fx, 15, by, 4.5, 6, C.body, C.line);
  ellipse(s, fx, 15, by + 2, 3.2, 4, C.belly);
  if (sleep) {
    blob(s, fx, 15, by - 3, 3, 2.6, C.body, C.line); rect(s, fx, 16, by - 3, 2, 1, C.line);
    return;
  }
  // Little paws held together at the chest.
  ellipse(s, fx, 17, by + 1, 1.4, 1.4, C.hi);
  // Head + tufty ears.
  const hy = by - 6;
  tri(s, fx, 13.5, hy - 2, 13, hy - 5, 15, hy - 2, C.ear); tri(s, fx, 17, hy - 2, 17.5, hy - 5, 16, hy - 2, C.ear);
  blob(s, fx, 15.5, hy, 3, 3, C.body, C.line);
  ellipse(s, fx, 17.5, hy + 0.5, 1.4, 1.2, C.body); // muzzle
  rect(s, fx, 17, hy - 1, 2, 2, C.line); // eye
  ellipse(s, fx, 18.6, hy + 0.5, 0.9, 0.8, C.line); // nose
}

// ════════════════════════════════════════════════════════════════════
// Owl — front-facing, big eyes, ear tufts, small beak.
// ════════════════════════════════════════════════════════════════════
function drawOwl(s, fx, name) {
  const C = { body: hex(0x8a6b48), belly: hex(0xc9b088), line: hex(0x46311d), disc: hex(0xd9c49a), eye: hex(0xf3d24a), beak: hex(0xe0952f), wing: hex(0x6f5334) };
  if (name === 'sleep_0') {
    ellipse(s, fx, 16, 29, 7, 1.4, C.belly);
    blob(s, fx, 16, 24, 7, 6, C.body, C.line);
    ellipse(s, fx, 16, 25, 5.5, 4, C.belly);
    // Eyes closed: two arcs.
    rect(s, fx, 13, 22, 2, 1, C.line); rect(s, fx, 17, 22, 2, 1, C.line);
    tri(s, fx, 15.5, 23, 16.5, 23, 16, 24.5, C.beak);
    return;
  }
  const p = BIRD[name];
  const bob = p.bob || 0, wing = p.wing || 0;
  const cy = 18 - bob;
  // Feet.
  ellipse(s, fx, 13, 30, 1.6, 1, C.beak); ellipse(s, fx, 19, 30, 1.6, 1, C.beak);
  // Plump body.
  blob(s, fx, 16, cy, 7, 8, C.body, C.line);
  ellipse(s, fx, 16, cy + 2, 5, 5.5, C.belly);
  // Wings hug the sides (lift a touch on flap).
  ellipse(s, fx, 10 + wing * 0.3, cy + 1 - wing, 2.4, 5, C.wing);
  ellipse(s, fx, 22 - wing * 0.3, cy + 1 - wing, 2.4, 5, C.wing);
  // Ear tufts.
  tri(s, fx, 11, cy - 6, 12.5, cy - 10, 14, cy - 6, C.body); tri(s, fx, 18, cy - 6, 19.5, cy - 10, 21, cy - 6, C.body);
  // Facial disc + big eyes.
  ellipse(s, fx, 16, cy - 4, 6, 4.5, C.disc);
  for (const ex of [13, 19]) { blob(s, fx, ex, cy - 4, 2.4, 2.6, C.eye, C.line); blob(s, fx, ex + 0.3, cy - 3.5, 1.1, 1.3, C.line, C.line); }
  // Beak between the eyes.
  tri(s, fx, 15.2, cy - 3, 16.8, cy - 3, 16, cy - 1, C.beak);
}

// ════════════════════════════════════════════════════════════════════
// Bird template (side profile) — duck, goose, woodpecker.
// ════════════════════════════════════════════════════════════════════
function sideBird(C) {
  return (s, fx, name) => {
    if (name === 'sleep_0') return sideBirdSleep(s, fx, C);
    const p = BIRD[name];
    const bob = p.bob || 0, wing = p.wing || 0, step = p.step || 0;
    const by = C.by - bob;
    // Legs.
    for (const [i, dx] of [[0, 1], [1, -1]].entries()) {
      const lx = 14 + dx * 2 + (i ? step : -step);
      rect(s, fx, lx, C.footY - 3, 1, 3, C.leg); ellipse(s, fx, lx + 0.5, C.footY, 1.6, 0.8, C.leg);
    }
    // Tail tuft (up at the back).
    tri(s, fx, C.cx - C.bodyRx, by - 1, C.cx - C.bodyRx - 3, by - 3, C.cx - C.bodyRx, by + 1.5, C.body);
    // Body.
    blob(s, fx, C.cx, by, C.bodyRx, C.bodyRy, C.body, C.line);
    ellipse(s, fx, C.cx, by + C.bodyRy * 0.4, C.bodyRx - 1, C.bodyRy * 0.55, C.belly);
    ellipse(s, fx, C.cx - 1, by - wing * 0.7, C.bodyRx * 0.6, C.bodyRy * 0.55, C.wingCol); // folded wing
    // Neck + head.
    const hx = C.headCX, hy = C.headCY - bob;
    ellipse(s, fx, (C.cx + C.bodyRx * 0.6 + hx) / 2, (by - C.bodyRy * 0.5 + hy) / 2, C.neckW || 2, (by - hy) * 0.5 + 1, C.body);
    if (C.cap) ellipse(s, fx, hx + 1, hy - C.headR + 1.2, C.headR * 0.85, C.headR * 0.7, C.cap);
    blob(s, fx, hx, hy, C.headR, C.headR, C.body, C.line);
    rect(s, fx, Math.round(hx + C.headR - 2), Math.round(hy - 0.5), 1, 1, C.line); // eye
    // Bill / beak.
    if (C.bill) { ellipse(s, fx, hx + C.headR + C.beakLen * 0.4, hy + 1, C.beakLen, 1.2, C.beak); }
    else { tri(s, fx, hx + C.headR - 1, hy, hx + C.headR + C.beakLen, hy + 0.5, hx + C.headR - 1, hy + 2, C.beak); }
  };
}
function sideBirdSleep(s, fx, C) {
  ellipse(s, fx, 15, 29, C.bodyRx, 1.3, C.belly);
  blob(s, fx, 15, 26, C.bodyRx + 0.5, C.bodyRy - 0.5, C.body, C.line);
  ellipse(s, fx, 15, 27, C.bodyRx - 1, C.bodyRy * 0.5, C.belly);
  blob(s, fx, 11, 25, C.headR - 0.4, C.headR - 0.4, C.body, C.line); // head tucked back
  rect(s, fx, 10, 25, 2, 1, C.line);
  ellipse(s, fx, 18, 26, C.bodyRx * 0.5, C.bodyRy * 0.5, C.wingCol);
}

// ════════════════════════════════════════════════════════════════════
// Frog — round body, bulging eyes, wide smile, hop cycle.
// ════════════════════════════════════════════════════════════════════
function drawFrog(s, fx, name) {
  const C = { body: hex(0x6fae4a), belly: hex(0xd6e6a0), line: hex(0x3a5a26), spot: hex(0x4d7c30), eye: hex(0xf2e24a) };
  if (name === 'sleep_0') {
    ellipse(s, fx, 16, 29, 8, 1.4, C.belly); blob(s, fx, 16, 27, 8, 2.6, C.body, C.line);
    ellipse(s, fx, 16, 27.5, 6.5, 1.4, C.belly);
    rect(s, fx, 12, 25, 2, 1, C.line); rect(s, fx, 19, 25, 2, 1, C.line);
    return;
  }
  const p = FROG[name];
  const hop = p.hop || 0, breath = p.breath || 0;
  const by = 24 - hop;
  const stretch = hop >= 3 ? 3 : 0;
  // Long back legs (fold/extend).
  tri(s, fx, 9, by + 1, 6 - stretch, by + 4, 11, by + 3, C.body);
  tri(s, fx, 23, by + 1, 26 + stretch, by + 4, 21, by + 3, C.body);
  ellipse(s, fx, 6 - stretch, by + 4, 2, 1, C.body); ellipse(s, fx, 26 + stretch, by + 4, 2, 1, C.body);
  // Front feet.
  ellipse(s, fx, 12, 29, 1.4, 1, C.body); ellipse(s, fx, 20, 29, 1.4, 1, C.body);
  // Body.
  blob(s, fx, 16, by, 7, 5 + breath, C.body, C.line);
  ellipse(s, fx, 16, by + 2.5, 5.5, 2.2, C.belly);
  ellipse(s, fx, 12, by - 1, 1.2, 1, C.spot); ellipse(s, fx, 20, by - 1, 1.2, 1, C.spot);
  // Bulging eyes on top.
  for (const ex of [12, 20]) { blob(s, fx, ex, by - 5, 2.2, 2.2, C.body, C.line); ellipse(s, fx, ex, by - 5, 1.3, 1.3, C.eye); rect(s, fx, ex, by - 5, 1, 1, C.line); }
  // Wide smile.
  rect(s, fx, 12, by + 1, 8, 1, C.line); px(s, fx, 11, by, C.line); px(s, fx, 21, by, C.line);
}

// ════════════════════════════════════════════════════════════════════
// Turtle — domed shell with scutes, stubby legs, slow shuffle.
// ════════════════════════════════════════════════════════════════════
function drawTurtle(s, fx, name) {
  const C = { shell: hex(0x5f8f3c), shellDk: hex(0x406527), shellHi: hex(0x7cab52), skin: hex(0x9bbd66), skinDk: hex(0x6f8f45), line: hex(0x2c451a), eye: hex(0x1c2c12) };
  if (name === 'sleep_0') {
    ellipse(s, fx, 16, 29, 9, 1.4, C.skinDk); blob(s, fx, 16, 25, 9.5, 5, C.shell, C.line);
    ellipse(s, fx, 16, 23.5, 6.5, 2.6, C.shellDk); ellipse(s, fx, 13, 22.5, 2.5, 1.4, C.shellHi);
    return;
  }
  const p = QUAD[name];
  const fl = p.frontLift || 0, bl = p.backLift || 0;
  const by = 25;
  // Stubby legs.
  ellipse(s, fx, 21, 28 - fl * 0.4, 2.2, 1.6, C.skin); ellipse(s, fx, 9, 28 - bl * 0.4, 2.2, 1.6, C.skin);
  ellipse(s, fx, 21, 28 - fl * 0.4, 2.2, 1.6, C.skinDk); // shade
  // Tail + head.
  ellipse(s, fx, 6, by + 1, 1.6, 1, C.skin);
  ellipse(s, fx, 24, by, 1.4, 1.2, C.skin); blob(s, fx, 25, by - 1, 2.2, 2, C.skin, C.line); rect(s, fx, 26, by - 1.5, 1, 1, C.eye);
  // Shell dome + scutes.
  blob(s, fx, 15, by - 2, 9, 5.5, C.shell, C.line);
  ellipse(s, fx, 15, by - 3.2, 7, 3.4, C.shellDk);
  ellipse(s, fx, 15, by - 3.6, 3.4, 1.9, C.shellHi);
  for (const dx of [-6, -2, 2, 6]) rect(s, fx, 15 + dx, by - 6, 1, 4, C.line);
  rect(s, fx, 9, by - 3, 12, 1, C.line);
}

// ════════════════════════════════════════════════════════════════════
// Butterfly — thin body, patterned wings, flap.
// ════════════════════════════════════════════════════════════════════
function drawButterfly(s, fx, name) {
  const C = { body: hex(0x3f3120), line: hex(0x241a10), w1: hex(0xe8793a), w2: hex(0xf4c24a), edge: hex(0x8a3550), spot: hex(0xfff2c4) };
  const sleep = name === 'sleep_0';
  const wing = sleep ? 0 : (INSECT[name].wing || 0);
  const cx = 16, cy = 18;
  // Body + head + antennae.
  rect(s, fx, cx, cy - 6, 1, 11, C.body); ellipse(s, fx, cx, cy - 6, 1.2, 1.4, C.body);
  px(s, fx, cx - 1, cy - 8, C.line); px(s, fx, cx - 2, cy - 9, C.line); px(s, fx, cx + 2, cy - 8, C.line); px(s, fx, cx + 3, cy - 9, C.line);
  if (sleep) { ellipse(s, fx, cx - 1, cy - 1, 2, 4, C.w1); ellipse(s, fx, cx + 2, cy - 1, 2, 4, C.w1); ellipse(s, fx, cx - 1, cy, 1, 1.4, C.spot); ellipse(s, fx, cx + 2, cy, 1, 1.4, C.spot); return; }
  const spread = 1 + wing * 1.1;
  for (const side of [-1, 1]) {
    const ex = cx + side * (1.5 + spread);
    blob(s, fx, ex, cy - 3.5, 2.4 + spread * 0.5, 3.2, C.w1, C.edge); // upper wing
    blob(s, fx, ex + side * 0.3, cy + 3, 2 + spread * 0.4, 2.6, C.w2, C.edge); // lower wing
    ellipse(s, fx, ex, cy - 3.5, 1, 1, C.spot);
  }
}

// ════════════════════════════════════════════════════════════════════
// Fireflies — a few tiny bugs, glow implied by bright core + soft halo.
// ════════════════════════════════════════════════════════════════════
function drawFireflies(s, fx, name) {
  const C = { body: hex(0x38331f), line: hex(0x201d0e), glow: hex(0xf2ff78), halo: hex(0xb9cf46), wing: hex(0xe4ead0) };
  const sleep = name === 'sleep_0';
  const wing = sleep ? 0 : (INSECT[name].wing || 0);
  const bugs = [ { x: 10, y: 12 }, { x: 21, y: 18 }, { x: 15, y: 23 } ];
  for (const b of bugs) {
    const w = 1 + wing * 0.6;
    ellipse(s, fx, b.x - 1.6, b.y - 1, w, 1.3, C.wing); ellipse(s, fx, b.x + 1.6, b.y - 1, w, 1.3, C.wing);
    ellipse(s, fx, b.x, b.y - 0.5, 1.3, 1.6, C.body); // thorax + head
    px(s, fx, b.x - 1, b.y - 1.5, C.line); // tiny eye hint
    if (!sleep) { ellipse(s, fx, b.x, b.y + 1.5, 2.1, 2.1, C.halo); ellipse(s, fx, b.x, b.y + 1.5, 1.1, 1.1, C.glow); }
    else { ellipse(s, fx, b.x, b.y + 1.3, 1, 1, C.halo); }
  }
}

// ════════════════════════════════════════════════════════════════════
// Species registry.
// ════════════════════════════════════════════════════════════════════
const deer = mammal({
  body: hex(0xc39359), belly: hex(0xeadbbe), hi: hex(0xd8b483), line: hex(0x6b4623), foot: hex(0x4a3018), legDk: hex(0x3a2614), nose: hex(0x2a1a10),
  cx: 13, bodyRx: 6, bodyRy: 4.2, by: 17, legLen: 10, legW: 1, headCX: 23, headCY: 9, headR: 2.8, muzLen: 2.2, muzH: 1.6, neckW: 1.8,
  ears: (s, fx, hx, hy) => {
    tri(s, fx, hx - 2, hy - 4, hx - 3, hy - 9, hx - 1, hy - 5, hex(0x8a6531)); tri(s, fx, hx - 3, hy - 6, hx - 4.5, hy - 8, hx - 2.5, hy - 6, hex(0x8a6531));
    tri(s, fx, hx + 3, hy - 4, hx + 4, hy - 9, hx + 2, hy - 5, hex(0x8a6531)); tri(s, fx, hx + 4, hy - 6, hx + 5.5, hy - 8, hx + 3.5, hy - 6, hex(0x8a6531));
    blob(s, fx, hx - 1.5, hy - 3, 1.2, 1.6, hex(0xc39359), hex(0x6b4623)); blob(s, fx, hx + 2.5, hy - 3, 1.2, 1.6, hex(0xc39359), hex(0x6b4623));
  },
  tail: (s, fx, by) => { ellipse(s, fx, 7, by, 1.4, 2, hex(0xc39359)); ellipse(s, fx, 7, by + 1.5, 1.2, 1.4, hex(0xeadbbe)); },
  extra: (s, fx, by, p, C) => { for (const [dx, dy] of [[-2, -1], [1, 0], [-4, 1]]) ellipse(s, fx, C.cx + dx, by + dy, 0.7, 0.5, C.hi); }, // dapple spots
});

const fox = mammal({
  body: hex(0xdb833a), belly: hex(0xf3eee4), hi: hex(0xe9a659), line: hex(0x5a2c12), foot: hex(0x33200f), legDk: hex(0x241608), nose: hex(0x201009),
  cx: 13, bodyRx: 6.5, bodyRy: 4, by: 19, legLen: 6, legW: 2, headCX: 23, headCY: 15, headR: 3.2, muzLen: 2.6, muzH: 1.6, neckW: 2.4,
  ears: pointyEars(hex(0xdb833a), hex(0xf3c0a0), hex(0x5a2c12)),
  tail: (s, fx, by) => { blob(s, fx, 5, by - 1, 4, 3.2, hex(0xdb833a), hex(0x5a2c12)); ellipse(s, fx, 3.5, by - 2.5, 2, 2, hex(0xf3eee4)); },
  extra: (s, fx, by, p, C, hx, hy) => { ellipse(s, fx, hx + 1.4, hy + 0.6, 1.6, 1.4, hex(0xf3eee4)); }, // white cheek
});

const bear = mammal({
  body: hex(0x6b4a30), belly: hex(0x89694a), hi: hex(0x7d5a3d), line: hex(0x38230f), foot: hex(0x2c1b0d), legDk: hex(0x22150a), nose: hex(0x18100a),
  cx: 14, bodyRx: 9, bodyRy: 7, by: 18, legLen: 6, legW: 3, headCX: 24, headCY: 13, headR: 4.5, muzLen: 2.6, muzH: 2.2, neckW: 3.4,
  ears: roundEars(hex(0x6b4a30), hex(0x89694a), hex(0x38230f)),
  tail: (s, fx, by) => ellipse(s, fx, 5, by + 1, 1.6, 1.6, hex(0x6b4a30)),
});

const otter = mammal({
  body: hex(0x8a6a48), belly: hex(0xcbb08a), hi: hex(0x9d7c58), line: hex(0x49301d), foot: hex(0x3a2515), legDk: hex(0x30200f), nose: hex(0x20140b),
  cx: 12, bodyRx: 8.5, bodyRy: 3.6, by: 21, legLen: 4, legW: 2, headCX: 24, headCY: 15, headR: 3, muzLen: 1.8, muzH: 1.6, neckW: 2.6,
  ears: (s, fx, hx, hy) => { blob(s, fx, hx - 1.5, hy - 2.6, 1, 1, hex(0x8a6a48), hex(0x49301d)); blob(s, fx, hx + 2.5, hy - 2.8, 1, 1, hex(0x8a6a48), hex(0x49301d)); },
  tail: (s, fx, by) => { ellipse(s, fx, 4, by + 1, 3.5, 1.6, hex(0x8a6a48)); ellipse(s, fx, 1.5, by + 1.5, 1.6, 1, hex(0x8a6a48)); },
  extra: (s, fx, by, p, C, hx, hy) => { ellipse(s, fx, hx + 2, hy + 1, 1.6, 1.2, hex(0xcbb08a)); }, // pale muzzle
});

const beaver = mammal({
  body: hex(0x7c5838), belly: hex(0xa17c50), hi: hex(0x8f6a44), line: hex(0x43280f), foot: hex(0x33200f), legDk: hex(0x281a0b), nose: hex(0x1c120a),
  cx: 14, bodyRx: 7.5, bodyRy: 6, by: 19, legLen: 5, legW: 2.4, headCX: 23, headCY: 15, headR: 4, muzLen: 2, muzH: 1.8, neckW: 3,
  ears: (s, fx, hx, hy) => { blob(s, fx, hx - 1.5, hy - 3.2, 1.2, 1.2, hex(0x5a3e28), hex(0x43280f)); blob(s, fx, hx + 2.5, hy - 3.4, 1.2, 1.2, hex(0x5a3e28), hex(0x43280f)); },
  tail: (s, fx, by) => { blob(s, fx, 5, by + 4, 4, 2.2, hex(0x4f3620), hex(0x43280f)); for (const dx of [-2.5, 0, 2.5]) rect(s, fx, 5 + dx, by + 2.5, 1, 3.5, hex(0x2e1d0d)); for (const dy of [-1, 1]) rect(s, fx, 2, by + 4 + dy, 6, 1, hex(0x2e1d0d)); },
  extra: (s, fx, by, p, C, hx, hy) => { rect(s, fx, Math.round(hx + C.headR + 0.5), Math.round(hy + 2), 2, 2, hex(0xf3eee4)); }, // buck teeth
});

const hedgehog = mammal({
  body: hex(0xb59a70), belly: hex(0xd8c4a0), hi: hex(0xcbb489), line: hex(0x5a4a34), foot: hex(0x4a3a24), legDk: hex(0x3c2f1c), nose: hex(0x201811),
  cx: 14, bodyRx: 7, bodyRy: 4.6, by: 21, legLen: 3, legW: 2, headCX: 24, headCY: 21, headR: 2.6, muzLen: 2, muzH: 1.4, neckW: 2,
  ears: () => {},
  extra: (s, fx, by, p, C) => {
    // Dense dome of spikes over the back.
    const spikes = hex(0x5a4a34), spikeHi = hex(0x6f5c40);
    for (let i = 0; i < 5; i++) {
      const bx = C.cx - 6 + i * 2.6;
      tri(s, fx, bx - 1.4, by - 1, bx, by - 8, bx + 1.4, by - 1, spikes);
      tri(s, fx, bx - 0.8, by - 2, bx, by - 6.5, bx + 0.4, by - 2, spikeHi);
    }
    for (let i = 0; i < 4; i++) { const bx = C.cx - 4.5 + i * 2.6; tri(s, fx, bx - 1.2, by + 1, bx, by - 4, bx + 1.2, by + 1, spikes); }
  },
  sleepExtra: (s, fx) => { for (let i = 0; i < 6; i++) { const bx = 9 + i * 2.4; tri(s, fx, bx - 1.3, 26, bx, 20, bx + 1.3, 26, hex(0x5a4a34)); } },
});

const duck = sideBird({
  body: hex(0xf1eee4), belly: hex(0xdad3c1), line: hex(0x847d6b), wingCol: hex(0xdad3c1), beak: hex(0xe9a63a), leg: hex(0xe9a63a),
  cx: 14, bodyRx: 6.5, bodyRy: 4.5, by: 21, footY: 30, headCX: 21, headCY: 15, headR: 3.4, beakLen: 3, bill: true, neckW: 2.4,
});
const goose = sideBird({
  body: hex(0xf5f3ed), belly: hex(0xe0dccc), line: hex(0x79735f), wingCol: hex(0xe0dccc), beak: hex(0xe98f2f), leg: hex(0xe98f2f),
  cx: 13, bodyRx: 6.5, bodyRy: 5, by: 20, footY: 30, headCX: 23, headCY: 8, headR: 2.8, beakLen: 2.6, bill: true, neckW: 1.8,
});
const woodpecker = sideBird({
  body: hex(0x2b2b31), belly: hex(0xf1eee4), line: hex(0x131319), wingCol: hex(0x3b3b45), beak: hex(0xd8c85a), leg: hex(0x6a5a3a),
  cx: 14, bodyRx: 5, bodyRy: 6, by: 20, footY: 29, headCX: 20, headCY: 11, headR: 3.2, beakLen: 5, cap: hex(0xd8433a), neckW: 2,
});

const SPECIES = {
  rabbit: drawRabbit, deer, squirrel: drawSquirrel, fox, hedgehog, beaver, otter, bear,
  owl: drawOwl, duck, goose, woodpecker, frog: drawFrog, turtle: drawTurtle, butterfly: drawButterfly, fireflies: drawFireflies,
};

// ── Build + write ───────────────────────────────────────────────────
const outDir = fileURLToPath(new URL('../public/assets', import.meta.url));
const sheets = {};
for (const [id, draw] of Object.entries(SPECIES)) { const sheet = buildAnimal(draw); sheets[id] = sheet; writePNG(`${outDir}/${id}.png`, sheet); }
console.log(`wrote ${Object.keys(SPECIES).length} spritesheets to ${outDir}`);

// Optional contact sheet for review.
const previewPath = process.argv[2];
if (previewPath) {
  const ids = Object.keys(sheets); const S = 6, cellW = 32 * S, cellH = 32 * S, cols = 7;
  const big = createSheet(0); big.W = cellW * cols; big.H = cellH * ids.length; big.buf = new Uint8Array(big.W * big.H * 4);
  ids.forEach((id, row) => { const src = sheets[id];
    for (let y = 0; y < src.H; y++) for (let x = 0; x < src.W; x++) {
      const si = (y * src.W + x) * 4; let r = src.buf[si], g = src.buf[si + 1], b = src.buf[si + 2], a = src.buf[si + 3];
      if (a === 0) { const c = ((x >> 2) + (y >> 2)) % 2 ? 55 : 38; r = g = b = c; a = 255; }
      for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) { const gx = x * S + sx, gy = row * cellH + y * S + sy; const di = (gy * big.W + gx) * 4; big.buf[di] = r; big.buf[di + 1] = g; big.buf[di + 2] = b; big.buf[di + 3] = a; } }
  });
  mkdirSync(dirname(previewPath), { recursive: true }); writeFileSync(previewPath, encodePNG(big));
  console.log(`wrote contact sheet ${previewPath}`);
}
