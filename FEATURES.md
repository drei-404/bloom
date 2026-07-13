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

## 14. Ecosystem Milestones

- Day-gated unlock system: each milestone has an id, a required Bloom Day, a label, and an optional `unlocks` key
- Data-driven registry (`milestoneRegistry.ts`) — open for extension, closed for modification
- Future systems append milestones via `registerMilestone(...)` at init time without touching existing entries
- Current unlock schedule: Bare Soil (Day 0) → Grass Complete (Day 3) → Flowers (Day 4) → Trees (Day 5) → Rocks (Day 9) → Ferns (Day 10) → Bushes (Day 11) → Tall Grass (Day 12) → Rain (Day 12) → Pond (Day 13) → Lily Pads (Day 14) → Animals + Rabbit (Day 15)
- **Rain (Day 12)** is declared in the registry as an unlock only — no simulation or render implementation yet

## 15. Tile Terrain System

- Tiles now carry a `terrainType` property (`grass` | `water`, extensible)
- `TerrainService` is the single gateway for terrain reads, writes, and placement validation
- Reservation system prevents two systems from claiming the same tile concurrently (e.g. pond footprint during generation)
- `canPlace(grid, x, y, allowed)` enforces terrain rules for all entity placement
- Grid mutations are immutable — `setTerrain` returns a new grid; original is never mutated
- Future systems (rivers, beaches, snow, biome packs) extend terrain without touching entity architecture

## 16. Flowers

- 4 types: white, pink, yellow, blue — type chosen per-flower by seeded RNG
- Spawn on grass tiles with growth ≥ 0.8 (mature/lush only)
- Target count 4–8 (deterministic per world seed)
- Sub-tile position offset up to 6 px from tile center (seeded)
- Unlock at Bloom Day 4 via milestone `DAY_4_FLOWERS_UNLOCKED`

## 17. Trees

- Species: oak (V1); lifecycle stages: sapling → young (Day 1) → mature (Day 2+)
- Spawn on mature grass tiles (growth ≥ 0.8)
- Target 7–9 trees; full population reached by Bloom Day 7
- Sub-tile offset up to 4 px (seeded)
- Unlock at Bloom Day 5 via milestone `DAY_5_TREES_UNLOCKED`

## 18. Rocks

- 3 sizes: small, medium, large — type chosen by seeded RNG
- Spawn on mature grass tiles (growth ≥ 0.8)
- Target count 2–5 (deterministic per world)
- Sub-tile offset up to 5 px (seeded)
- Unlock at Bloom Day 9 via milestone `DAY_9_ROCKS_UNLOCKED`

## 19. Vegetation (Ferns, Bushes, Tall Grass)

- Shared `VegetationTypeConfig` schema covers type, label, milestone, count range, and tree-proximity bias
- **Ferns** (Day 10): 3–5, prefer tiles within 2 steps of a tree
- **Bushes** (Day 11): 2–4, no placement bias
- **Tall Grass** (Day 12): 6–10, no placement bias
- All vegetation requires mature grass terrain (growth ≥ 0.8)
- Managed through `DecorationRegistry` — no per-type system needed

## 20. Pond & Lily Pads

- **Pond** (Day 13): 3–6 connected water tiles, generated by seeded flood-fill; expands 1 tile/Bloom Day after unlock
- Pond tiles change terrain to `water`; reserved during generation to prevent placement conflicts
- **Lily Pads** (Day 14): 1–3 pads placed on water tiles by seeded RNG; managed as decorations via `DecorationRegistry`
- Lily pads use the `IDecoration` interface — no AI, no lifecycle, persistent and deterministic

## 21. Animals & Rabbit

- `IAnimal` interface: id, species, tile position, createdAtBloomDay, state (`idle` | `walking` | `sleeping`), facing (`N/E/S/W`), ageDays
- `AnimalRegistry` — loads and saves all animals; `AnimalRegionService` — spatial queries (animals by tile region)
- **Rabbit** species (Day 15): max population 3, spawn preference within 2 tiles of trees / vegetation
- Behavioral timers (seeded): idle 120–300 s, walk 5–15 s, sleep 60–180 s; 30% chance idle → sleep instead of walk
- **Live in V1**: the rabbit simulates *and* renders — FSM-driven movement, per-animal `AnimationController` (idle / walking / sleeping clips), east-default sprites mirrored for west facing. Behaviour and metadata now live in the wildlife Species/Family framework (§22), not `rabbitConfig.ts`

## 22. Wildlife Simulation Framework

- Deterministic, data-driven animal pipeline run once per tick (`WildlifeSimulationService.ts`):
  **PopulationManager → AnimalBrainService → MovementSystem → ScheduleSystem → InteractionSystem**
- **Species = data, behaviour = family**: a `SpeciesDefinition` (packs) is bound to a `FamilyBehavior`
  - `ground_herbivore` implemented (FSM idle / walking / sleeping, rest chance, spawn + timers)
  - `flying`, `wetland`, `predator` declared — no handlers yet
- **Movement strategies** — ground / flying / water, resolved through a registry (`wildlife/movement/`)
- **No `Math.random()`** — every animal draws from its own seeded stream, fully reproducible per world seed
- **16 species content packs** (`content/packs/`): rabbit (reference, real art) + butterfly, hedgehog, squirrel, beaver, deer, fox, bear, duck, goose, frog, turtle, otter, owl, woodpecker, fireflies (data / placeholder art)
- Open for extension — a new animal is a content pack + a family binding; no engine changes

## 23. Ecosystem Identity & Native Species Discovery

- Each world gets a permanent, seeded set of **native species** (`ecosystemConfig.nativeSpeciesCount = 4`)
- Species are **discovered one at a time**, not all at once: first from Bloom Day 15, then every 2 Bloom Days
  (`discoveryStartBloomDay`, `discoveryIntervalBloomDays`)
- `NativeSpeciesService` + `nativeSelection.ts` pick the set deterministically from the world seed —
  two installs with the same seed discover the same species in the same order
- Gives every world a distinct "who lives here" identity that unfolds over runtime

## 24. Terrain Art & Sprite Pipeline

- **Textured iso tiles** with per-tile deterministic variants — 6 grass + 4 dirt variants, grass/dirt blend at the growth midpoint (`renderer/terrainVariant.ts`)
- **Floating island with cliff faces** — continuous banded cliff walls plus seeded scatter detail (stone, roots, moss) along the face
- **Rounded silhouette corners** at the four island vertices
- **Animated water** — 4-frame ripple clip per water tile, phase-offset so ponds don't animate in lockstep; **shoreline foam** with 8 directional edge variants
- **Day/night ambient tint** — `ambientColor()` lerps every color toward night blue by `timeOfDay`, applied to tiles, cliffs, trees, animals, decorations
- **Sprite-or-primitive dual pipeline** — assets with a loaded texture draw as sprites; otherwise a primitive shape is drawn from the asset's palette metadata. Missing art degrades gracefully, never crashes
- **Depth-sorted scene layer** (trees + animals) redraws every frame for smooth motion; static layers rebuild only on sim update
- Real art drops into `assets/placeholderPack.ts` / `AssetRegistry` with **no renderer changes**

## 25. Control Panel — What It Can Display & Roadmap

The existing Control Panel (§12) is a shell with 5 sections. The simulation already tracks far more
live state than it surfaces. This section catalogs what a panel can show **today** with zero new plumbing,
what's tunable, and what to build next.

### 25.1 Live state available now (already in the Zustand store)

All read directly from `src/core/store.ts` — no new simulation code needed:

| Display | Source |
|---------|--------|
| Bloom Day, runtime hours / minutes, total ticks | `getWorldClock(totalTicks)` |
| % tiles green / overall bloom progress | `worldState.tileGrid` |
| Day / night phase + `timeOfDay` fraction | `worldState.timeOfDay` |
| Current activity level (Idle/Low/Med/High) + growth-boost % | `activityHistory`, `totalActivityScore` |
| 20-sample activity sparkline | `activityHistory` |
| Lifetime active / idle time, key & mouse counts | `cumulativeActivity` |
| Milestones unlocked vs upcoming + "next unlock in N days" | `unlockedMilestones`, `milestoneRegistry` |
| Entity census — flowers (by color), trees (by stage), rocks (by size), vegetation, pond size, lily pads, animals (by species/state) | `flowers` / `trees` / `rocks` / `pond` / `decorations` / `animals` |
| Native species discovered vs remaining + next discovery day | `NativeSpeciesService`, `ecosystemConfig` |
| World identity — name, UUID, seed, created, version | `identity` |

### 25.2 Tunables not yet exposed (read-only `config/*.ts` today)

Candidates for panel sliders / inputs — most would apply on next launch:

- Growth: `baseRate`, `spreadFactor`, `nightMultiplier`, activity→growth mapping (offset 0.3 / slope 0.035)
- Timing: `autoSaveIntervalTicks`, `dayLengthTicks`, `idleThresholdMs`
- Entities: per-type target counts and unlock days (flowers, trees, rocks, vegetation, pond, lily pads)
- Ecosystem: `nativeSpeciesCount`, discovery start day + interval
- Geometry: island scale (already partly exposed), grid dimensions

### 25.3 Suggested additions (build with current Bloom)

- **Dashboard tab** — hero stat (Bloom Day + % green), milestone progress bar, next-unlock countdown, live entity-census cards. *Reads: `getWorldClock`, `tileGrid`, `unlockedMilestones`, entity collections*
- **Ecosystem timeline** — visual milestone track (done / current / locked) with day markers. *Reads: `milestoneRegistry`, `unlockedMilestones`*
- **Activity insights** — extend the existing chart: today vs lifetime, growth contribution, streaks. *Reads: `activityHistory`, `cumulativeActivity`*
- **Species / collection view** — grid of native species: discovered (art) vs mystery silhouette + discovery ETA. *Reads: `NativeSpeciesService`, `animals`*
- **World snapshot card** — reuse the existing screenshot flow into a shareable stat card. *Reads: `ScreenshotManager`, `identity`*
- **Advanced / dev tuning** (opt-in) — expose §25.2 config values behind an "Advanced" toggle, with live growth-rate preview. *Writes: `config` overrides via settings*
- **Theme / visual** — finish the currently-disabled Theme dropdown (season / palette packs) wired to `ambientColor`. *Reads/Writes: `settings.theme`*

---

## Architecture Principles

- **Separation of concerns** — simulation, rendering, persistence are independent layers
- **Simulation never renders; renderer never simulates; only PersistenceService runs SQL**
- **Config-driven** — growth, island geometry, clock, day/night all in config files
- **Replaceable renderer** — `IRenderer` interface; PixiJS is one implementation
- **Deterministic** — seeded RNG makes future procedural generation reproducible; `fork(salt)` gives each system its own independent stream
- **Offline-first** — no server, no cloud, no network dependency
- **Open for extension** — milestones, entity types, terrain types, decoration types, and animal species are all registered data; no existing code changes when new content is added
- **Terrain as a tile property** — `TerrainService` owns all terrain reads/writes; entities validate placement rules through it, never directly

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

Rare creatures, biomes, seasons, weather (Rain milestone declared only), marketplace,
achievements, Steam integration. Non-ground animal families (flying / wetland / predator declared,
no handlers yet); most of the 16 species ship with placeholder art (rabbit is the reference with real art).
The architecture (seed, World Clock, SimulationContext, milestone registry, terrain system,
entity + species/family registries) is built to add these without rework.
