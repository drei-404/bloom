export interface EntityTypeDescriptor {
  type: string;
  label: string;
}

/**
 * Registry of ecosystem entity types. Open for extension, closed for
 * modification: future entities self-register their type at module init
 * without touching existing entries.
 */
class EntityRegistry {
  private readonly types = new Map<string, EntityTypeDescriptor>();

  /** Register an entity type. No-op if the type is already registered. */
  register(descriptor: EntityTypeDescriptor): void {
    if (this.types.has(descriptor.type)) return;
    this.types.set(descriptor.type, descriptor);
  }

  get(type: string): EntityTypeDescriptor | undefined {
    return this.types.get(type);
  }

  has(type: string): boolean {
    return this.types.has(type);
  }

  all(): EntityTypeDescriptor[] {
    return [...this.types.values()];
  }
}

export const entityRegistry = new EntityRegistry();
