import { animalRegistry, type AnimalSpeciesDescriptor } from './AnimalRegistry';

/**
 * The single source of truth for every animal the framework knows about and the
 * ecosystems each belongs to. Imported once at startup to populate the registry.
 *
 * Adding a species here (with its affinities) makes it eligible for native
 * selection without touching selection, discovery, or persistence code — the
 * registry stays open for extension, closed for modification. Species without a
 * generation/behavior/render implementation are still valid natives: a world can
 * discover them as data until their visuals are built.
 */
const CATALOG: AnimalSpeciesDescriptor[] = [
  // Meadow — rabbit is registered by its Content Pack (content/packs/rabbit.pack.ts),
  // not here; this catalog holds the not-yet-implemented species for native selection.
  { species: 'butterfly', label: 'Butterfly', affinities: ['meadow'] },
  { species: 'hedgehog', label: 'Hedgehog', affinities: ['meadow'] },
  // Shared: meadow + forest
  { species: 'fox', label: 'Fox', affinities: ['meadow', 'forest'] },
  { species: 'deer', label: 'Deer', affinities: ['meadow', 'forest'] },
  { species: 'owl', label: 'Owl', affinities: ['meadow', 'forest'] },
  // Forest
  { species: 'squirrel', label: 'Squirrel', affinities: ['forest'] },
  { species: 'woodpecker', label: 'Woodpecker', affinities: ['forest'] },
  { species: 'bear', label: 'Bear', affinities: ['forest'] },
  // Wetland
  { species: 'duck', label: 'Duck', affinities: ['wetland'] },
  { species: 'goose', label: 'Goose', affinities: ['wetland'] },
  { species: 'frog', label: 'Frog', affinities: ['wetland'] },
  { species: 'turtle', label: 'Turtle', affinities: ['wetland'] },
  { species: 'otter', label: 'Otter', affinities: ['wetland'] },
  { species: 'fireflies', label: 'Fireflies', affinities: ['wetland'] },
];

for (const descriptor of CATALOG) {
  animalRegistry.register(descriptor);
}
