# Bloom — Feature Summary

Bloom is a living desktop companion. A small floating isometric island sits on your
desktop and grows from dirt into grass as you use your computer. Built offline-first
with Tauri + React + TypeScript + PixiJS + Rust + SQLite.

---

## 1. Desktop Companion Shell

- Frameless, transparent, borderless Tauri window (400×350) — the island *is* the app
- Draggable anywhere on the desktop (`startDragging`)
- Lock position toggle
- Always-on-top toggle
- Window position remembered between launches (`prefs.json`)
- Right-click context menu: Control Panel, Lock Position, Always on Top, Save Screenshot,
  Export World, Import World, About, Quit
- Menu closes on outside click or ESC

## 2. Isometric Island Renderer (PixiJS)

- 10×10 isometric tile grid, pixel-art style, transparent background
- Layered draw: drop shadow, dirt cylinder edge, grass top faces, depth-sorted vegetation
- Per-tile color interpolates dirt → grass by growth level
- Blocky grass tufts appear as tiles mature (deterministic placement)
- Day/night ambient tint over the island
- Renderer is fully swappable behind an `IRenderer` interface — no simulation/SQL coupling

## 3. Tile-Based Growth Simulation

- Grass spreads tile-by-tile over dirt
- Neighbor-spread model: tiles grow faster next to grassy tiles
- Growth speed driven by user activity and day/night
- Pure functions, no side effects — simulation never touches rendering or SQL
- Config-driven growth rates (`growthConfig.ts`)

## 4. Activity Tracking

- System-wide idle detection via Rust (`GetLastInputInfo` on Windows)
- Local mouse / keyboard / window-focus counters
- More activity → faster growth; idle → very slow; closed → stopped
- Privacy: only counts tracked — never keystrokes, content, or personal data
- Cumulative lifetime stats (active/idle minutes, key/mouse events)

## 5. Day / Night Cycle (Visual)

- 20-minute day + 20-minute night (configurable)
- Sky-free: expressed as an ambient tint over the island
- Purely visual — independent of progression

## 6. World Clock (Runtime Progression)

- `1 Bloom Day = 24 runtime hours`
- Runtime accumulates only while Bloom is running (stops on close / shutdown)
- No offline progression, no catch-up, no wall-clock dependence
- Pure derivation from `totalTicks` — single source of truth
- Exposes `runtimeMinutes`, `runtimeHours`, `bloomDays`
- Fully independent from the visual day/night cycle
- `SimulationContext` carries the clock to all systems for future gating

## 7. SQLite Persistence Layer

- SQLite is the single source of truth (offline, local-only)
- `PersistenceService` is the only gateway — simulation and renderer never run SQL
- Tables: `world_identity`, `world_metadata`, `world_tiles`, `settings`,
  `activity_stats`, `world_integrity`
- Autosave every 30 seconds, on app close, and on progression milestones
- Automatic JSON → SQLite migration from earlier versions
- Versioned schema with migrations (`PRAGMA user_version`)
- Startup flow: init DB → migrate → load settings → load world → restore clock →
  start simulation → start rendering

## 8. World Identity System

- Every world has a permanent, immutable identity generated once at first install
- `world_uuid` — format `BLOOM-WLD-XXXXXXXX`
- `world_name` — generated (adjective + noun, e.g. "Emerald Grove")
- `world_seed` — numeric seed for procedural systems
- `created_at`, `bloom_version`
- Stored in dedicated `world_identity` table; never changes
- `WorldIdentityService`: load, validate, expose, derive RNG (via PersistenceService)
- Displayed in Control Panel → About

## 9. Seeded Randomization

- Deterministic PRNG (`SeededRandom`, mulberry32) driven by the world seed
- Same seed → same layout, forever
- `fork(salt)` derives independent reproducible streams per system
- Future procedural content (flowers, trees, pond, rocks, biomes, rare creatures)
  draws from this — never `Math.random()`

## 10. Data Integrity (Ed25519)

- Every save generates a content hash + Ed25519 signature
- Every load verifies the signature; mismatch → load rejected + corruption warning
- Signing key generated once, stored locally
- Detects corruption and casual tampering (local-key threat model)
- Public-key binding: forged saves must also hold the private key

## 11. Export / Import (`.bloom`)

- Export packages the world into a signed `.bloom` archive (ZIP):
  `manifest.json`, `metadata.json`, `world.db`, `signature.bin`
- Manifest-as-root: one Ed25519 signature transitively covers all entries via SHA-256
- Import: one active world per install; importing **replaces** the current world
- Before replacement: automatic backup of the current world
- Validation: verify manifest → verify signature → verify schema version → verify hashes
- Confirmation preview shows world name, UUID, created date, runtime days
- After import: re-signed with the local key so integrity holds going forward

## 12. Control Panel

- Separate window with five sections:
  - **General** — startup, always-on-top, lock position toggles
  - **Ecosystem** — day/night durations, growth settings
  - **Activity** — activity level + recent-activity chart
  - **Visuals** — island scale, theme
  - **About** — app info + World Identity (name, UUID, seed, created, version)
- All settings persist locally via SQLite (through PersistenceService)

## 13. Startup Integration

- Optionally launches with Windows (registry, user-toggleable, persisted)
- Runs in background, shows the island immediately

---

## Architecture Principles

- **Separation of concerns** — simulation, rendering, persistence are independent layers
- **Simulation never renders; renderer never simulates; only PersistenceService runs SQL**
- **Config-driven** — growth, island geometry, clock, day/night all in config files
- **Replaceable renderer** — `IRenderer` interface; PixiJS is one implementation
- **Deterministic** — seeded RNG makes future procedural generation reproducible
- **Offline-first** — no server, no cloud, no network dependency

## Tech Stack

| Layer | Tech |
|-------|------|
| Desktop shell | Tauri 2 |
| UI | React 19 + TypeScript |
| Rendering | PixiJS 8 |
| State | Zustand |
| Backend | Rust |
| Storage | SQLite (rusqlite, bundled) |
| Crypto | Ed25519 (ed25519-dalek), SHA-256 |
| Packaging | ZIP (.bloom) |

## Deliberately Not Yet Implemented

Flowers, trees, ponds, rocks, animals, rare creatures, biomes, seasons, weather,
marketplace, achievements, Steam integration. The architecture (seed, World Clock,
SimulationContext, entity-ready schema) is built to add these without rework.
