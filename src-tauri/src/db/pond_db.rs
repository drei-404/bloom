use rusqlite::{params, Connection, OptionalExtension};

use super::types::PondIPC;

pub fn load_pond(conn: &Connection) -> Result<Option<PondIPC>, String> {
    conn.query_row(
        "SELECT footprint, final_size, revealed_count, created_at_bloom_day
         FROM pond WHERE id = 1",
        [],
        |row| {
            Ok(PondIPC {
                footprint: row.get(0)?,
                final_size: row.get(1)?,
                revealed_count: row.get(2)?,
                created_at_bloom_day: row.get(3)?,
            })
        },
    )
    .optional()
    .map_err(|e| e.to_string())
}

/// Upsert the single pond row (id = 1). Exactly one pond per world.
pub fn save_pond(conn: &Connection, pond: &PondIPC) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO pond
         (id, footprint, final_size, revealed_count, created_at_bloom_day)
         VALUES (1, ?1, ?2, ?3, ?4)",
        params![
            pond.footprint,
            pond.final_size,
            pond.revealed_count,
            pond.created_at_bloom_day
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
