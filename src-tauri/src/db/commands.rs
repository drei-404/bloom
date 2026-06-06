use tauri::{AppHandle, Manager, State};

use super::format::ImportPreview;
use super::types::{
    ActivityStatsIPC, MilestoneRecordIPC, SettingsSnapshotIPC, WorldIdentityIPC, WorldSnapshotIPC,
};
use super::{activity_db, export, import, milestones_db, settings_db, world, DbState};

#[tauri::command]
pub fn db_export_world(
    app: AppHandle,
    state: State<'_, DbState>,
    path: String,
) -> Result<(), String> {
    let db_path = super::db_path(&app)?;
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    export::write_bloom(&conn, &state.key, &db_path, &path)
}

#[tauri::command]
pub fn db_import_preview(path: String) -> Result<ImportPreview, String> {
    import::read_preview(&path)
}

#[tauri::command]
pub fn db_import_world(
    app: AppHandle,
    state: State<'_, DbState>,
    path: String,
) -> Result<ImportPreview, String> {
    let db_path = super::db_path(&app)?;
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let mut conn = state.conn.lock().map_err(|e| e.to_string())?;
    import::import_world(&mut conn, &state.key, &db_path, &dir, &path)
}

#[tauri::command]
pub fn db_load_identity(state: State<'_, DbState>) -> Result<Option<WorldIdentityIPC>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    world::load_identity(&conn)
}

#[tauri::command]
pub fn db_load_world(state: State<'_, DbState>) -> Result<Option<WorldSnapshotIPC>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    world::load_world(&conn, &state.key)
}

#[tauri::command]
pub fn db_save_world(state: State<'_, DbState>, snapshot: WorldSnapshotIPC) -> Result<(), String> {
    let mut conn = state.conn.lock().map_err(|e| e.to_string())?;
    world::save_world(&mut conn, &state.key, &snapshot)
}

#[tauri::command]
pub fn db_load_settings(state: State<'_, DbState>) -> Result<Option<SettingsSnapshotIPC>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    settings_db::load_settings(&conn)
}

#[tauri::command]
pub fn db_save_settings(
    state: State<'_, DbState>,
    snapshot: SettingsSnapshotIPC,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    settings_db::save_settings(&conn, &snapshot)
}

#[tauri::command]
pub fn db_load_activity(state: State<'_, DbState>) -> Result<Option<ActivityStatsIPC>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    activity_db::load_activity(&conn)
}

#[tauri::command]
pub fn db_load_milestones(state: State<'_, DbState>) -> Result<Vec<MilestoneRecordIPC>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    milestones_db::load_milestones(&conn)
}

#[tauri::command]
pub fn db_save_milestone(
    state: State<'_, DbState>,
    record: MilestoneRecordIPC,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    milestones_db::save_milestone(&conn, &record)
}

#[tauri::command]
pub fn db_save_activity(
    state: State<'_, DbState>,
    snapshot: ActivityStatsIPC,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    activity_db::save_activity(&conn, &snapshot)
}
