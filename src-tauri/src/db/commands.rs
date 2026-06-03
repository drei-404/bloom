use tauri::State;

use super::types::{ActivityStatsIPC, SettingsSnapshotIPC, WorldSnapshotIPC};
use super::{activity_db, settings_db, world, DbState};

#[tauri::command]
pub fn db_load_world(state: State<'_, DbState>) -> Result<Option<WorldSnapshotIPC>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    world::load_world(&conn)
}

#[tauri::command]
pub fn db_save_world(state: State<'_, DbState>, snapshot: WorldSnapshotIPC) -> Result<(), String> {
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    world::save_world(&mut conn, &snapshot)
}

#[tauri::command]
pub fn db_load_settings(state: State<'_, DbState>) -> Result<Option<SettingsSnapshotIPC>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    settings_db::load_settings(&conn)
}

#[tauri::command]
pub fn db_save_settings(
    state: State<'_, DbState>,
    snapshot: SettingsSnapshotIPC,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    settings_db::save_settings(&conn, &snapshot)
}

#[tauri::command]
pub fn db_load_activity(state: State<'_, DbState>) -> Result<Option<ActivityStatsIPC>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    activity_db::load_activity(&conn)
}

#[tauri::command]
pub fn db_save_activity(
    state: State<'_, DbState>,
    snapshot: ActivityStatsIPC,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    activity_db::save_activity(&conn, &snapshot)
}
