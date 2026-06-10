use ed25519_dalek::{Signer, SigningKey};
use rusqlite::Connection;
use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::Write;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};
use zip::write::SimpleFileOptions;
use zip::ZipWriter;

use super::format::{
    EntryInfo, ExportMetadata, Manifest, Summary, ENTRY_METADATA, ENTRY_SIGNATURE, ENTRY_WORLD_DB,
    FORMAT_ID, FORMAT_VERSION,
};

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

fn sha256_hex(bytes: &[u8]) -> String {
    let mut h = Sha256::new();
    h.update(bytes);
    hex::encode(h.finalize())
}

fn read_metadata(conn: &Connection) -> Result<ExportMetadata, String> {
    conn.query_row(
        "SELECT world_uuid, world_name, created_at, bloom_version,
                current_day, island_stage, runtime_minutes
         FROM world_metadata LIMIT 1",
        [],
        |r| {
            Ok(ExportMetadata {
                world_uuid: r.get(0)?,
                world_name: r.get(1)?,
                created_at: r.get(2)?,
                bloom_version: r.get(3)?,
                summary: Summary {
                    current_day: r.get(4)?,
                    island_stage: r.get(5)?,
                    runtime_minutes: r.get(6)?,
                },
            })
        },
    )
    .map_err(|_| "NO_WORLD".to_string())
}

/// Package the live world into a signed .bloom archive at `out_path`.
pub fn write_bloom(
    conn: &Connection,
    key: &SigningKey,
    db_path: &Path,
    out_path: &str,
) -> Result<(), String> {
    // Flush WAL so the on-disk db file is complete before copying.
    let _ = conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);");

    let db_bytes = std::fs::read(db_path).map_err(|e| e.to_string())?;
    let metadata = read_metadata(conn)?;
    let meta_json = serde_json::to_vec_pretty(&metadata).map_err(|e| e.to_string())?;

    let entries = vec![
        EntryInfo {
            name: ENTRY_METADATA.to_string(),
            sha256: sha256_hex(&meta_json),
            bytes: meta_json.len() as u64,
        },
        EntryInfo {
            name: ENTRY_WORLD_DB.to_string(),
            sha256: sha256_hex(&db_bytes),
            bytes: db_bytes.len() as u64,
        },
    ];

    let manifest = Manifest {
        format: FORMAT_ID.to_string(),
        format_version: FORMAT_VERSION,
        bloom_version: metadata.bloom_version.clone(),
        exported_at: now_ms(),
        world_uuid: metadata.world_uuid.clone(),
        entries,
        public_key: hex::encode(key.verifying_key().to_bytes()),
    };
    let manifest_json = serde_json::to_vec(&manifest).map_err(|e| e.to_string())?;
    let signature = key.sign(&manifest_json);

    let file = File::create(out_path).map_err(|e| e.to_string())?;
    let mut zip = ZipWriter::new(file);
    let opts = SimpleFileOptions::default();

    let mut put = |name: &str, data: &[u8]| -> Result<(), String> {
        zip.start_file(name, opts).map_err(|e| e.to_string())?;
        zip.write_all(data).map_err(|e| e.to_string())
    };

    // manifest first so readers hit it without scanning.
    put(super::format::ENTRY_MANIFEST, &manifest_json)?;
    put(ENTRY_METADATA, &meta_json)?;
    put(ENTRY_WORLD_DB, &db_bytes)?;
    put(ENTRY_SIGNATURE, &signature.to_bytes())?;

    zip.finish().map_err(|e| e.to_string())?;
    Ok(())
}
