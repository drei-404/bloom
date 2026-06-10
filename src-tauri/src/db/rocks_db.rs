use rusqlite::{params, Connection};

use super::types::RockIPC;

pub fn load_rocks(conn: &Connection) -> Result<Vec<RockIPC>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, tile_x, tile_y, offset_x, offset_y, rock_type, created_at_bloom_day
             FROM rocks
             ORDER BY created_at_bloom_day ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(RockIPC {
                id: row.get(0)?,
                tile_x: row.get(1)?,
                tile_y: row.get(2)?,
                offset_x: row.get(3)?,
                offset_y: row.get(4)?,
                rock_type: row.get(5)?,
                created_at_bloom_day: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(rows)
}

/// Replace the full rock set. Deterministic generation owns the list; a clean
/// DELETE + INSERT keeps the table an exact mirror of simulation state.
pub fn save_rocks(conn: &mut Connection, rocks: &[RockIPC]) -> Result<(), String> {
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM rocks", [])
        .map_err(|e| e.to_string())?;
    for r in rocks {
        tx.execute(
            "INSERT INTO rocks
             (id, tile_x, tile_y, offset_x, offset_y, rock_type, created_at_bloom_day)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![r.id, r.tile_x, r.tile_y, r.offset_x, r.offset_y, r.rock_type, r.created_at_bloom_day],
        )
        .map_err(|e| e.to_string())?;
    }
    tx.commit().map_err(|e| e.to_string())
}
