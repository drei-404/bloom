import type { EntityInstance, EntityType } from '../types/entity';

export class EntityPool {
  private readonly entities = new Map<string, EntityInstance>();

  add(entity: Omit<EntityInstance, 'id'>): EntityInstance {
    const id = crypto.randomUUID();
    const full: EntityInstance = { ...entity, id };
    this.entities.set(id, full);
    return full;
  }

  remove(id: string): boolean {
    return this.entities.delete(id);
  }

  get(id: string): EntityInstance | undefined {
    return this.entities.get(id);
  }

  update(id: string, updater: (e: EntityInstance) => EntityInstance): void {
    const entity = this.entities.get(id);
    if (entity) this.entities.set(id, updater(entity));
  }

  getAll(): EntityInstance[] {
    return Array.from(this.entities.values());
  }

  getByType(type: EntityType): EntityInstance[] {
    return this.getAll().filter(e => e.type === type);
  }

  count(type?: EntityType): number {
    return type ? this.getByType(type).length : this.entities.size;
  }

  clear(): void {
    this.entities.clear();
  }

  static fromArray(entities: EntityInstance[]): EntityPool {
    const pool = new EntityPool();
    for (const entity of entities) {
      pool.entities.set(entity.id, entity);
    }
    return pool;
  }
}
