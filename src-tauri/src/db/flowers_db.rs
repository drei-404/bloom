use rusqlite::{params, Connection};

use super::types::FlowerIPC;

pub fn load_flowers(conn: &Connection) -> Result<Vec<FlowerIPC>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, tile_x, tile_y, offset_x, offset_y, flower_type, created_at
             FROM flowers
             ORDER BY created_at ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(FlowerIPC {
                id: row.get(0)?,
                tile_x: row.get(1)?,
                tile_y: row.get(2)?,
                offset_x: row.get(3)?,
                offset_y: row.get(4)?,
                flower_type: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(rows)
}

/// Replace the full flower set. Deterministic generation owns the list, so a
/// clean DELETE + INSERT keeps the table an exact mirror of simulation state.
pub fn save_flowers(conn: &mut Connection, flowers: &[FlowerIPC]) -> Result<(), String> {
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM flowers", [])
        .map_err(|e| e.to_string())?;
    for f in flowers {
        tx.execute(
            "INSERT INTO flowers
             (id, tile_x, tile_y, offset_x, offset_y, flower_type, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![f.id, f.tile_x, f.tile_y, f.offset_x, f.offset_y, f.flower_type, f.created_at],
        )
        .map_err(|e| e.to_string())?;
    }
    tx.commit().map_err(|e| e.to_string())
}
