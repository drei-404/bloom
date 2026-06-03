use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorldSnapshotIPC {
    pub world_uuid: Option<String>,
    pub world_name: String,
    pub created_at: i64,
    pub runtime_minutes: i64,
    pub current_day: i32,
    pub growth_points: f64,
    pub bloom_version: String,
    pub tiles: Vec<TileSnapshotIPC>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TileSnapshotIPC {
    pub tile_x: i32,
    pub tile_y: i32,
    pub grass_level: f64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsSnapshotIPC {
    pub startup_enabled: bool,
    pub always_on_top: bool,
    pub locked_position: bool,
    pub island_scale: f64,
    pub hud_enabled: bool,
    pub day_duration_min: i64,
    pub night_duration_min: i64,
    pub theme: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ActivityStatsIPC {
    pub active_minutes: i64,
    pub idle_minutes: i64,
    pub keyboard_events: i64,
    pub mouse_events: i64,
}
