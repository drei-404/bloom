use rusqlite::{params, Connection, OptionalExtension};

use super::types::{EcosystemIdentityIPC, NativeSpeciesIPC};

/// Read the immutable ecosystem identity, if one has been persisted yet.
pub fn load_ecosystem_identity(conn: &Connection) -> Result<Option<EcosystemIdentityIPC>, String> {
    conn.query_row(
        "SELECT world_uuid, affinity, created_at FROM ecosystem_identity LIMIT 1",
        [],
        |row| {
            Ok(EcosystemIdentityIPC {
                world_uuid: row.get(0)?,
                affinity: row.get(1)?,
                created_at: row.get(2)?,
            })
        },
    )
    .optional()
    .map_err(|e| e.to_string())
}

/// Persist the ecosystem identity. First write wins — the affinity is chosen once
/// at world creation and never changes, so re-saving is a no-op.
pub fn save_ecosystem_identity(conn: &Connection, rec: &EcosystemIdentityIPC) -> Result<(), String> {
    conn.execute(
        "INSERT OR IGNORE INTO ecosystem_identity (world_uuid, affinity, created_at)
         VALUES (?1, ?2, ?3)",
        params![rec.world_uuid, rec.affinity, rec.created_at],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn load_native_species(conn: &Connection) -> Result<Vec<NativeSpeciesIPC>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT species, slot, discovered, discovered_bloom_day
             FROM native_species
             ORDER BY slot ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(NativeSpeciesIPC {
                species: row.get(0)?,
                slot: row.get(1)?,
                discovered: row.get::<_, i64>(2)? != 0,
                discovered_bloom_day: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(rows)
}

/// Replace the full native-species set. The service owns the list (exactly four
/// entries); a clean DELETE + INSERT keeps the table an exact mirror.
pub fn save_native_species(conn: &mut Connection, species: &[NativeSpeciesIPC]) -> Result<(), String> {
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM native_species", [])
        .map_err(|e| e.to_string())?;
    for s in species {
        tx.execute(
            "INSERT INTO native_species (species, slot, discovered, discovered_bloom_day)
             VALUES (?1, ?2, ?3, ?4)",
            params![s.species, s.slot, s.discovered as i64, s.discovered_bloom_day],
        )
        .map_err(|e| e.to_string())?;
    }
    tx.commit().map_err(|e| e.to_string())
}
