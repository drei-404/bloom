import type { WorldIdentity } from '../types/identity';
import type { EcosystemAffinity } from '../types/ecosystem';
import { PersistenceService } from '../persistence/PersistenceService';
import { selectAffinity } from './nativeSelection';

/**
 * The hidden, immutable ecosystem character of a world (Meadow / Forest /
 * Wetland). Chosen exactly once at world creation, deterministically from the
 * world seed, then persisted and read back as the source of truth forever —
 * export/import carry it unchanged.
 *
 * Never talks to SQLite directly; all access goes through PersistenceService.
 */
class EcosystemIdentityService {
  private affinity: EcosystemAffinity | null = null;

  /**
   * Return the world's affinity, generating + persisting it the first time.
   * A persisted value always wins and is never recomputed.
   */
  async ensure(identity: WorldIdentity): Promise<EcosystemAffinity> {
    const existing = await PersistenceService.loadEcosystemIdentity();
    if (existing) {
      this.affinity = existing.affinity as EcosystemAffinity;
      return this.affinity;
    }

    const affinity = selectAffinity(identity);
    await PersistenceService.saveEcosystemIdentity({
      worldUuid: identity.worldUuid,
      affinity,
      createdAt: Date.now(),
    });
    this.affinity = affinity;
    return affinity;
  }

  /** The loaded affinity, or null before `ensure` has run. */
  current(): EcosystemAffinity | null {
    return this.affinity;
  }
}

export const ecosystemIdentityService = new EcosystemIdentityService();
