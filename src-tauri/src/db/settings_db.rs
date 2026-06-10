use rusqlite::{params, Connection, OptionalExtension};

use super::types::SettingsSnapshotIPC;

pub fn save_settings(conn: &Connection, snap: &SettingsSnapshotIPC) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO settings
         (id, startup_enabled, always_on_top, locked_position, island_scale,
          hud_enabled, day_duration_min, night_duration_min, theme)
         VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            snap.startup_enabled as i32,
            snap.always_on_top as i32,
            snap.locked_position as i32,
            snap.island_scale,
            snap.hud_enabled as i32,
            snap.day_duration_min,
            snap.night_duration_min,
            snap.theme,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn load_settings(conn: &Connection) -> Result<Option<SettingsSnapshotIPC>, String> {
    conn.query_row(
        "SELECT startup_enabled, always_on_top, locked_position, island_scale,
                hud_enabled, day_duration_min, night_duration_min, theme
         FROM settings WHERE id = 1",
        [],
        |row| {
            Ok(SettingsSnapshotIPC {
                startup_enabled: row.get::<_, i32>(0)? != 0,
                always_on_top: row.get::<_, i32>(1)? != 0,
                locked_position: row.get::<_, i32>(2)? != 0,
                island_scale: row.get(3)?,
                hud_enabled: row.get::<_, i32>(4)? != 0,
                day_duration_min: row.get(5)?,
                night_duration_min: row.get(6)?,
                theme: row.get(7)?,
            })
        },
    )
    .optional()
    .map_err(|e| e.to_string())
}
