use tauri::{AppHandle, Manager, State};

use super::format::ImportPreview;
use super::types::{
    ActivityStatsIPC, AnimalIPC, DecorationIPC, EcosystemIdentityIPC, FlowerIPC, MilestoneRecordIPC,
    NativeSpeciesIPC, PondIPC, RockIPC, SettingsSnapshotIPC, TreeIPC, WorldIdentityIPC,
    WorldSnapshotIPC,
};
use super::{
    activity_db, animals_db, decorations_db, ecosystem_db, export, flowers_db, import,
    milestones_db, pond_db, rocks_db, settings_db, trees_db, world, DbState,
};

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
pub fn db_load_flowers(state: State<'_, DbState>) -> Result<Vec<FlowerIPC>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    flowers_db::load_flowers(&conn)
}

#[tauri::command]
pub fn db_save_flowers(state: State<'_, DbState>, flowers: Vec<FlowerIPC>) -> Result<(), String> {
    let mut conn = state.conn.lock().map_err(|e| e.to_string())?;
    flowers_db::save_flowers(&mut conn, &flowers)
}

#[tauri::command]
pub fn db_load_trees(state: State<'_, DbState>) -> Result<Vec<TreeIPC>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    trees_db::load_trees(&conn)
}

#[tauri::command]
pub fn db_save_trees(state: State<'_, DbState>, trees: Vec<TreeIPC>) -> Result<(), String> {
    let mut conn = state.conn.lock().map_err(|e| e.to_string())?;
    trees_db::save_trees(&mut conn, &trees)
}

#[tauri::command]
pub fn db_load_rocks(state: State<'_, DbState>) -> Result<Vec<RockIPC>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    rocks_db::load_rocks(&conn)
}

#[tauri::command]
pub fn db_save_rocks(state: State<'_, DbState>, rocks: Vec<RockIPC>) -> Result<(), String> {
    let mut conn = state.conn.lock().map_err(|e| e.to_string())?;
    rocks_db::save_rocks(&mut conn, &rocks)
}

#[tauri::command]
pub fn db_load_pond(state: State<'_, DbState>) -> Result<Option<PondIPC>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    pond_db::load_pond(&conn)
}

#[tauri::command]
pub fn db_save_pond(state: State<'_, DbState>, pond: PondIPC) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    pond_db::save_pond(&conn, &pond)
}

#[tauri::command]
pub fn db_load_decorations(state: State<'_, DbState>) -> Result<Vec<DecorationIPC>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    decorations_db::load_decorations(&conn)
}

#[tauri::command]
pub fn db_save_decorations(
    state: State<'_, DbState>,
    decorations: Vec<DecorationIPC>,
) -> Result<(), String> {
    let mut conn = state.conn.lock().map_err(|e| e.to_string())?;
    decorations_db::save_decorations(&mut conn, &decorations)
}

#[tauri::command]
pub fn db_load_animals(state: State<'_, DbState>) -> Result<Vec<AnimalIPC>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    animals_db::load_animals(&conn)
}

#[tauri::command]
pub fn db_save_animals(state: State<'_, DbState>, animals: Vec<AnimalIPC>) -> Result<(), String> {
    let mut conn = state.conn.lock().map_err(|e| e.to_string())?;
    animals_db::save_animals(&mut conn, &animals)
}

#[tauri::command]
pub fn db_save_activity(
    state: State<'_, DbState>,
    snapshot: ActivityStatsIPC,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    activity_db::save_activity(&conn, &snapshot)
}

#[tauri::command]
pub fn db_load_ecosystem_identity(
    state: State<'_, DbState>,
) -> Result<Option<EcosystemIdentityIPC>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    ecosystem_db::load_ecosystem_identity(&conn)
}

#[tauri::command]
pub fn db_save_ecosystem_identity(
    state: State<'_, DbState>,
    record: EcosystemIdentityIPC,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    ecosystem_db::save_ecosystem_identity(&conn, &record)
}

#[tauri::command]
pub fn db_load_native_species(state: State<'_, DbState>) -> Result<Vec<NativeSpeciesIPC>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    ecosystem_db::load_native_species(&conn)
}

#[tauri::command]
pub fn db_save_native_species(
    state: State<'_, DbState>,
    species: Vec<NativeSpeciesIPC>,
) -> Result<(), String> {
    let mut conn = state.conn.lock().map_err(|e| e.to_string())?;
    ecosystem_db::save_native_species(&mut conn, &species)
}
