mod activity;
mod autostart;
mod db;
mod storage;

use db::DbState;
use std::sync::Mutex;
use tauri::Manager;



#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let handle = app.handle();
            let mut conn = db::open_db(handle).expect("failed to open bloom.db");
            db::schema::init_schema(&conn).expect("failed to init schema");

            let dir = handle
                .path()
                .app_data_dir()
                .expect("no app data dir");

            // Load (or generate) the Ed25519 signing key before any signing happens.
            let key = db::integrity::load_or_create_key(&dir)
                .expect("failed to load signing key");

            db::migration::run_migration(&mut conn, &key, &dir)
                .expect("failed to run migration");

            // Guarantee the immutable world identity exists exactly once.
            db::world::ensure_identity(&conn).expect("failed to ensure world identity");

            // Sign current content if migrated / pre-integrity save had no signature.
            db::world::ensure_signed(&conn, &key).expect("failed to sign world");

            app.manage(DbState {
                conn: Mutex::new(conn),
                key,
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            storage::save_data,
            storage::load_data,
            activity::get_system_idle_ms,
            autostart::set_autostart,
            autostart::get_autostart,
            db::commands::db_load_identity,
            db::commands::db_load_world,
            db::commands::db_save_world,
            db::commands::db_load_settings,
            db::commands::db_save_settings,
            db::commands::db_load_activity,
            db::commands::db_save_activity,
            db::commands::db_load_milestones,
            db::commands::db_save_milestone,
            db::commands::db_load_flowers,
            db::commands::db_save_flowers,
            db::commands::db_load_trees,
            db::commands::db_save_trees,
            db::commands::db_load_rocks,
            db::commands::db_save_rocks,
            db::commands::db_load_pond,
            db::commands::db_save_pond,
            db::commands::db_load_decorations,
            db::commands::db_save_decorations,
            db::commands::db_load_animals,
            db::commands::db_save_animals,
            db::commands::db_load_ecosystem_identity,
            db::commands::db_save_ecosystem_identity,
            db::commands::db_load_native_species,
            db::commands::db_save_native_species,
            db::commands::db_export_world,
            db::commands::db_import_preview,
            db::commands::db_import_world,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}
