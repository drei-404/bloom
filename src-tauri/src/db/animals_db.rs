use rusqlite::{params, Connection};

use super::types::AnimalIPC;

pub fn load_animals(conn: &Connection) -> Result<Vec<AnimalIPC>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, species, tile_x, tile_y, created_at_bloom_day, state, facing, age_days,
                    home_tile_x, home_tile_y
             FROM animals",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(AnimalIPC {
                id: row.get(0)?,
                species: row.get(1)?,
                tile_x: row.get(2)?,
                tile_y: row.get(3)?,
                created_at_bloom_day: row.get(4)?,
                state: row.get(5)?,
                facing: row.get(6)?,
                age_days: row.get(7)?,
                home_tile_x: row.get(8)?,
                home_tile_y: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(rows)
}

/// Replace the full animal set. Simulation owns the list; a clean DELETE +
/// INSERT keeps the table an exact mirror of simulation state.
pub fn save_animals(conn: &mut Connection, animals: &[AnimalIPC]) -> Result<(), String> {
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM animals", [])
        .map_err(|e| e.to_string())?;
    for a in animals {
        tx.execute(
            "INSERT INTO animals
             (id, species, tile_x, tile_y, created_at_bloom_day, state, facing, age_days,
              home_tile_x, home_tile_y)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                a.id, a.species, a.tile_x, a.tile_y, a.created_at_bloom_day,
                a.state, a.facing, a.age_days, a.home_tile_x, a.home_tile_y
            ],
        )
        .map_err(|e| e.to_string())?;
    }
    tx.commit().map_err(|e| e.to_string())
}
