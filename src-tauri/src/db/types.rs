use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorldIdentityIPC {
    pub world_uuid: String,
    pub world_name: String,
    pub world_seed: i64,
    pub created_at: i64,
    pub bloom_version: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TileSnapshotIPC {
    pub tile_x: i32,
    pub tile_y: i32,
    pub grass_level: f64,
    #[serde(default = "default_terrain")]
    pub terrain_type: String,
}

fn default_terrain() -> String {
    "grass".to_string()
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

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MilestoneRecordIPC {
    pub milestone_id: String,
    pub unlocked_bloom_day: i64,
    pub unlocked_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FlowerIPC {
    pub id: String,
    pub tile_x: i32,
    pub tile_y: i32,
    pub offset_x: f64,
    pub offset_y: f64,
    pub flower_type: String,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TreeIPC {
    pub id: String,
    pub tile_x: i32,
    pub tile_y: i32,
    pub offset_x: f64,
    pub offset_y: f64,
    pub species: String,
    pub stage: String,
    pub created_at_bloom_day: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RockIPC {
    pub id: String,
    pub tile_x: i32,
    pub tile_y: i32,
    pub offset_x: f64,
    pub offset_y: f64,
    pub rock_type: String,
    pub created_at_bloom_day: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PondIPC {
    pub footprint: String,
    pub final_size: i64,
    pub revealed_count: i64,
    pub created_at_bloom_day: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DecorationIPC {
    pub id: String,
    pub decoration_type: String,
    pub tile_x: i32,
    pub tile_y: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EcosystemIdentityIPC {
    pub world_uuid: String,
    pub affinity: String,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NativeSpeciesIPC {
    pub species: String,
    pub slot: i64,
    pub discovered: bool,
    pub discovered_bloom_day: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AnimalIPC {
    pub id: String,
    pub species: String,
    pub tile_x: i32,
    pub tile_y: i32,
    pub created_at_bloom_day: i64,
    pub state: String,
    pub facing: String,
    pub age_days: i64,
    pub home_tile_x: i32,
    pub home_tile_y: i32,
}
