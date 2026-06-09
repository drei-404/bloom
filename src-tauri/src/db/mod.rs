pub mod activity_db;
pub mod commands;
pub mod export;
pub mod flowers_db;
pub mod format;
pub mod import;
pub mod integrity;
pub mod migration;
pub mod milestones_db;
pub mod schema;
pub mod settings_db;
pub mod types;
pub mod world;

use ed25519_dalek::SigningKey;
use rusqlite::Connection;
use std::sync::Mutex;
use tauri::Manager;

pub struct DbState {
    pub conn: Mutex<Connection>,
    pub key: SigningKey,
}

pub fn db_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("bloom.db"))
}

pub fn open_db(app: &tauri::AppHandle) -> Result<Connection, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Connection::open(dir.join("bloom.db")).map_err(|e| e.to_string())
}
