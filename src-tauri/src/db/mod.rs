pub mod activity_db;
pub mod commands;
pub mod integrity;
pub mod migration;
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

pub fn open_db(app: &tauri::AppHandle) -> Result<Connection, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let db_path = dir.join("bloom.db");
    Connection::open(&db_path).map_err(|e| e.to_string())
}
