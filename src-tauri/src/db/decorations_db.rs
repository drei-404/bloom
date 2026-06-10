use rusqlite::{params, Connection};

use super::types::DecorationIPC;

pub fn load_decorations(conn: &Connection) -> Result<Vec<DecorationIPC>, String> {
    let mut stmt = conn
        .prepare("SELECT id, decoration_type, tile_x, tile_y FROM decorations")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(DecorationIPC {
                id: row.get(0)?,
                decoration_type: row.get(1)?,
                tile_x: row.get(2)?,
                tile_y: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(rows)
}

/// Replace the full decoration set. Deterministic placement owns the list; a
/// clean DELETE + INSERT keeps the table an exact mirror of simulation state.
pub fn save_decorations(conn: &mut Connection, decos: &[DecorationIPC]) -> Result<(), String> {
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM decorations", [])
        .map_err(|e| e.to_string())?;
    for d in decos {
        tx.execute(
            "INSERT INTO decorations (id, decoration_type, tile_x, tile_y)
             VALUES (?1, ?2, ?3, ?4)",
            params![d.id, d.decoration_type, d.tile_x, d.tile_y],
        )
        .map_err(|e| e.to_string())?;
    }
    tx.commit().map_err(|e| e.to_string())
}
