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
// Every Phase 1 animal now owns itself through its Content Pack
// (content/packs/*.pack.ts): rabbit, butterfly, hedgehog, squirrel, beaver,
// deer, fox, bear, duck, goose, frog, turtle, otter, owl, woodpecker and
// fireflies. No implemented species remain here. The catalog stays as the
// extension point for future not-yet-implemented species (add a descriptor to
// make it a selectable native before its visuals/pack exist).
const CATALOG: AnimalSpeciesDescriptor[] = [];

for (const descriptor of CATALOG) {
  animalRegistry.register(descriptor);
}
