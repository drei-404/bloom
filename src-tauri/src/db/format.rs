use serde::{Deserialize, Serialize};

pub const FORMAT_ID: &str = "bloom-export";
pub const FORMAT_VERSION: u32 = 1;
pub const SCHEMA_VERSION: i64 = 1;

pub const ENTRY_MANIFEST: &str = "manifest.json";
pub const ENTRY_METADATA: &str = "metadata.json";
pub const ENTRY_WORLD_DB: &str = "world.db";
pub const ENTRY_SIGNATURE: &str = "signature.bin";

#[derive(Debug, Serialize, Deserialize)]
pub struct EntryInfo {
    pub name: String,
    pub sha256: String,
    pub bytes: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Manifest {
    pub format: String,
    pub format_version: u32,
    pub bloom_version: String,
    pub exported_at: i64,
    pub world_uuid: String,
    pub entries: Vec<EntryInfo>,
    pub public_key: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Summary {
    pub current_day: i32,
    pub island_stage: i32,
    pub runtime_minutes: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportMetadata {
    pub world_uuid: String,
    pub world_name: String,
    pub created_at: i64,
    pub bloom_version: String,
    pub summary: Summary,
}

/// Preview shown before import confirmation. Crosses IPC -> camelCase.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportPreview {
    pub world_name: String,
    pub world_uuid: String,
    pub created_at: i64,
    pub current_day: i32,
}
