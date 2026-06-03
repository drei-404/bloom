use std::fs;
use std::path::PathBuf;
use tauri::Manager;

fn get_save_path(app: &tauri::AppHandle, filename: &str) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(filename))
}

#[tauri::command]
pub fn save_data(app: tauri::AppHandle, filename: String, data: String) -> Result<(), String> {
    let path = get_save_path(&app, &filename)?;
    fs::write(&path, data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_data(app: tauri::AppHandle, filename: String) -> Result<String, String> {
    let path = get_save_path(&app, &filename)?;
    fs::read_to_string(&path).map_err(|e| e.to_string())
}
