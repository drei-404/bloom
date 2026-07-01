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
  // Meadow/forest ground mammals — rabbit, deer, hedgehog, squirrel, fox and
  // bear are registered by their Content Packs (content/packs/*.pack.ts), not
  // here. Forest flyers (owl, woodpecker) and wetland species (beaver, duck,
  // goose, frog, turtle, otter) likewise own themselves through their packs.
  // This catalog holds only the not-yet-implemented species for native selection.
  // Wetland — only fireflies remains unimplemented.
  { species: 'fireflies', label: 'Fireflies', affinities: ['wetland'] },
];

for (const descriptor of CATALOG) {
  animalRegistry.register(descriptor);
}
