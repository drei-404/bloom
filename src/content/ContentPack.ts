/**
 * A self-contained unit of Bloom content. A species pack bundles everything an
 * animal needs — its SpeciesDefinition, AssetDescriptor(s), animation metadata,
 * population config and ecosystem affinity — behind `register()`. Adding content
 * is authoring one pack; no existing code changes.
 *
 * Packs are pure registration: they call into the existing registries
 * (SpeciesRegistry, AssetRegistry, AnimalRegistry). They never render, simulate,
 * or touch persistence.
 */
export interface ContentPack {
  /** Unique pack id, e.g. `bloom.species.rabbit`. */
  id: string;
  /** Semantic version of the pack's content. */
  version: string;
  /** Free-form descriptive data (display name, author, family, …). */
  metadata?: Record<string, unknown>;
  /** Ids of other packs that must load first. */
  dependencies?: string[];
  /** Register all of the pack's content into the app registries. Idempotent. */
  register(): void;
  /** Remove the pack's content from the registries (best effort). */
  unregister(): void;
}
