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
        .setup(|app| {
            let handle = app.handle();
            let mut conn = db::open_db(handle).expect("failed to open bloom.db");
            db::schema::init_schema(&conn).expect("failed to init schema");

            let dir = handle
                .path()
                .app_data_dir()
                .expect("no app data dir");
            db::migration::run_migration(&mut conn, &dir)
                .expect("failed to run migration");

            // Guarantee the immutable world identity exists exactly once.
            db::world::ensure_identity(&conn).expect("failed to ensure world identity");

            app.manage(DbState(Mutex::new(conn)));
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}
