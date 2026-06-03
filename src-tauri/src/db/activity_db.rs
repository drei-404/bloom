use rusqlite::{params, Connection, OptionalExtension};

use super::types::ActivityStatsIPC;

pub fn save_activity(conn: &Connection, snap: &ActivityStatsIPC) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO activity_stats
         (id, active_minutes, idle_minutes, keyboard_events, mouse_events)
         VALUES (1, ?1, ?2, ?3, ?4)",
        params![
            snap.active_minutes,
            snap.idle_minutes,
            snap.keyboard_events,
            snap.mouse_events,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn load_activity(conn: &Connection) -> Result<Option<ActivityStatsIPC>, String> {
    conn.query_row(
        "SELECT active_minutes, idle_minutes, keyboard_events, mouse_events
         FROM activity_stats WHERE id = 1",
        [],
        |row| {
            Ok(ActivityStatsIPC {
                active_minutes: row.get(0)?,
                idle_minutes: row.get(1)?,
                keyboard_events: row.get(2)?,
                mouse_events: row.get(3)?,
            })
        },
    )
    .optional()
    .map_err(|e| e.to_string())
}
