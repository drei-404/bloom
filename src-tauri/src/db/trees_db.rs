use rusqlite::{params, Connection};

use super::types::TreeIPC;

pub fn load_trees(conn: &Connection) -> Result<Vec<TreeIPC>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, tile_x, tile_y, offset_x, offset_y, species, stage, created_at_bloom_day
             FROM trees
             ORDER BY created_at_bloom_day ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(TreeIPC {
                id: row.get(0)?,
                tile_x: row.get(1)?,
                tile_y: row.get(2)?,
                offset_x: row.get(3)?,
                offset_y: row.get(4)?,
                species: row.get(5)?,
                stage: row.get(6)?,
                created_at_bloom_day: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(rows)
}

/// Replace the full tree set. Deterministic generation owns the list; a clean
/// DELETE + INSERT keeps the table an exact mirror of simulation state.
pub fn save_trees(conn: &mut Connection, trees: &[TreeIPC]) -> Result<(), String> {
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM trees", [])
        .map_err(|e| e.to_string())?;
    for t in trees {
        tx.execute(
            "INSERT INTO trees
             (id, tile_x, tile_y, offset_x, offset_y, species, stage, created_at_bloom_day)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                t.id, t.tile_x, t.tile_y, t.offset_x, t.offset_y,
                t.species, t.stage, t.created_at_bloom_day
            ],
        )
        .map_err(|e| e.to_string())?;
    }
    tx.commit().map_err(|e| e.to_string())
}
