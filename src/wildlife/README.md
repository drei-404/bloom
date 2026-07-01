# Wildlife Simulation Layer

Reusable, deterministic, data-driven animal simulation. After the Species
Framework milestone the architecture is **complete**: the rest of Bloom V1's
animals are added through configuration + artwork, not new systems.

## Architecture

One coordinator runs a fixed pipeline every simulation tick:

```
PopulationManager → AnimalBrainService → MovementSystem → ScheduleSystem → InteractionSystem
```

- **Simulation never renders; renderer never simulates.** The coordinator returns
  updated animal state; the renderer reads it and pulls sprites from AssetRegistry.
- **No `Math.random()`.** All variation comes from `WorldIdentityService` seeded
  per-animal streams (`${species}-behavior-${id}`, `${species}-spawn-order`, …).
- **Persistence only via `PersistenceService`.** No SQL in the simulation.

## Species = data. Behaviour = family.

- **`SpeciesDefinition`** (in `SpeciesRegistry`) is pure identity/metadata:
  `species, label, family, movementType, assetId, affinities, homeRadius,
  population, preferredTerrain, activityWindow`. No behaviour.
- **`FamilyBehavior`** (registered per `SpeciesFamily`) owns behaviour shared by
  every member: FSM `states`, `restChance`, `spawn` preference, state `timers`.
- The simulation dispatches on **family**, never on species. There is no
  `if (species === 'rabbit')` anywhere. `SpeciesRegistry.resolve(species)` merges
  a definition with its family behaviour into a `ResolvedSpecies` the systems read.

Families today: `ground_herbivore` (implemented). `flying`, `wetland`, `predator`
are declared for future behaviour and have no handler yet.

## Adding a new species (config only)

To add e.g. a **deer** (a ground herbivore), with **no changes to any simulation
system**:

1. **Register metadata** — create `wildlife/species/deer.ts`:
   ```ts
   speciesRegistry.register({
     species: 'deer', label: 'Deer', family: 'ground_herbivore',
     movementType: 'walk', assetId: ASSET_IDS.animal('deer'),
     affinities: ['forest', 'meadow'], homeRadius: 6,
     population: { min: 1, max: 2 }, preferredTerrain: ['grass'],
     activityWindow: 'always',
   });
   ```
   Import it once in `WildlifeSimulationService.ts` (next to `./species/rabbit`).

2. **Provide an asset** — register `animal.deer` in an asset pack
   (`assets/placeholderPack.ts` or a future art pack). Until art exists it can be
   a placeholder palette; the renderer draws whatever the registry returns.

3. **Add affinity** — add `deer` to the ecosystem catalog
   (`animal/speciesCatalog.ts`) so worlds can discover it as a native species.

That is the entire footprint. No new services, no behaviour code, no renderer
changes. A genuinely new *behaviour* (e.g. flight) means registering a new
`FamilyBehavior` for that family — done once, then reused by every species in it.

## Boundaries

No predator logic, breeding, needs, flying, or swimming are implemented. Those
are future families/systems; the current pipeline only knows the calm
ground-herbivore loop.
