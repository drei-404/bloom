use ed25519_dalek::{Signature, SigningKey, VerifyingKey};
use rusqlite::Connection;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::io::Read;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use super::format::{
    ExportMetadata, ImportPreview, Manifest, ENTRY_MANIFEST, ENTRY_METADATA, ENTRY_SIGNATURE,
    ENTRY_WORLD_DB, FORMAT_ID, FORMAT_VERSION, SCHEMA_VERSION,
};
use super::world;

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

/// Read all archive entries into memory.
fn read_archive(path: &str) -> Result<HashMap<String, Vec<u8>>, String> {
    let file = std::fs::File::open(path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipArchive::new(file).map_err(|_| "BAD_ARCHIVE".to_string())?;

    let mut out = HashMap::new();
    for i in 0..zip.len() {
        let mut entry = zip.by_index(i).map_err(|_| "BAD_ARCHIVE".to_string())?;
        let name = entry.name().to_string();
        let mut buf = Vec::new();
        entry.read_to_end(&mut buf).map_err(|e| e.to_string())?;
        out.insert(name, buf);
    }
    Ok(out)
}

/// Validate manifest, entry hashes, and signature. Returns parsed metadata.
fn validate(entries: &HashMap<String, Vec<u8>>) -> Result<ExportMetadata, String> {
    let manifest_bytes = entries
        .get(ENTRY_MANIFEST)
        .ok_or("MANIFEST_MISSING".to_string())?;
    let sig_bytes = entries
        .get(ENTRY_SIGNATURE)
        .ok_or("SIGNATURE_MISSING".to_string())?;

    let manifest: Manifest =
        serde_json::from_slice(manifest_bytes).map_err(|_| "BAD_MANIFEST".to_string())?;

    if manifest.format != FORMAT_ID {
        return Err("FORMAT_MISMATCH".to_string());
    }
    if manifest.format_version != FORMAT_VERSION {
        return Err("FORMAT_VERSION_MISMATCH".to_string());
    }

    // Verify signature over manifest bytes using the manifest's embedded public key.
    let pk_bytes = hex::decode(&manifest.public_key).map_err(|_| "BAD_PUBKEY".to_string())?;
    let pk_arr: [u8; 32] = pk_bytes.try_into().map_err(|_| "BAD_PUBKEY".to_string())?;
    let verifying_key =
        VerifyingKey::from_bytes(&pk_arr).map_err(|_| "BAD_PUBKEY".to_string())?;
    let sig_arr: [u8; 64] = sig_bytes
        .clone()
        .try_into()
        .map_err(|_| "BAD_SIGNATURE".to_string())?;
    let signature = Signature::from_bytes(&sig_arr);
    verifying_key
        .verify_strict(manifest_bytes, &signature)
        .map_err(|_| "SIGNATURE_INVALID".to_string())?;

    // Every listed entry must be present and hash-match.
    for entry in &manifest.entries {
        let data = entries
            .get(&entry.name)
            .ok_or_else(|| format!("ENTRY_MISSING:{}", entry.name))?;
        if sha256_hex(data) != entry.sha256 {
            return Err("MANIFEST_HASH_MISMATCH".to_string());
        }
    }

    let meta_bytes = entries
        .get(ENTRY_METADATA)
        .ok_or("METADATA_MISSING".to_string())?;
    let metadata: ExportMetadata =
        serde_json::from_slice(meta_bytes).map_err(|_| "BAD_METADATA".to_string())?;
    Ok(metadata)
}

/// Validate a .bloom and return its preview without modifying anything.
pub fn read_preview(path: &str) -> Result<ImportPreview, String> {
    let entries = read_archive(path)?;
    let metadata = validate(&entries)?;
    Ok(ImportPreview {
        world_name: metadata.world_name,
        world_uuid: metadata.world_uuid,
        created_at: metadata.created_at,
        current_day: metadata.summary.current_day,
    })
}

fn check_schema(conn: &Connection) -> Result<(), String> {
    let version: i64 = conn
        .query_row("PRAGMA src.user_version", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    if version != SCHEMA_VERSION {
        return Err("SCHEMA_MISMATCH".to_string());
    }
    let table_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM src.sqlite_master WHERE type='table'
             AND name IN ('world_identity','world_metadata','world_tiles',
                          'settings','activity_stats','ecosystem_milestones')",
            [],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    if table_count != 6 {
        return Err("SCHEMA_MISMATCH".to_string());
    }
    Ok(())
}

fn copy_tables(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        DELETE FROM world_identity;
        INSERT INTO world_identity SELECT * FROM src.world_identity;
        DELETE FROM world_metadata;
        INSERT INTO world_metadata SELECT * FROM src.world_metadata;
        DELETE FROM world_tiles;
        INSERT INTO world_tiles SELECT * FROM src.world_tiles;
        DELETE FROM settings;
        INSERT INTO settings SELECT * FROM src.settings;
        DELETE FROM activity_stats;
        INSERT INTO activity_stats SELECT * FROM src.activity_stats;
        DELETE FROM ecosystem_milestones;
        INSERT INTO ecosystem_milestones SELECT * FROM src.ecosystem_milestones;
        ",
    )
    .map_err(|e| e.to_string())
}

/// Replace the current world with the imported one.
/// Backs up the current DB first, then re-signs with the local key.
pub fn import_world(
    conn: &mut Connection,
    key: &SigningKey,
    db_path: &Path,
    app_dir: &Path,
    path: &str,
) -> Result<ImportPreview, String> {
    // 1. Validate before touching anything.
    let entries = read_archive(path)?;
    let _ = validate(&entries)?;
    let world_db = entries
        .get(ENTRY_WORLD_DB)
        .ok_or("WORLD_DB_MISSING".to_string())?;

    // 2. Write imported db to a temp file.
    let tmp_path = app_dir.join("import_tmp.db");
    std::fs::write(&tmp_path, world_db).map_err(|e| e.to_string())?;
    let tmp_str = tmp_path.to_str().ok_or("BAD_TMP_PATH".to_string())?;

    // 3. Automatic backup of the current world before replacement.
    let _ = conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);");
    let backups = app_dir.join("backups");
    std::fs::create_dir_all(&backups).map_err(|e| e.to_string())?;
    let backup_path = backups.join(format!("bloom-backup-{}.db", now_ms()));
    std::fs::copy(db_path, &backup_path).map_err(|e| e.to_string())?;

    // 4. Attach + validate schema + copy + detach, inside a transaction.
    conn.execute("ATTACH DATABASE ?1 AS src", [tmp_str])
        .map_err(|e| e.to_string())?;

    let result = (|| {
        check_schema(conn)?;
        let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
        copy_tables(&tx)?;
        tx.commit().map_err(|e| e.to_string())?;
        Ok::<(), String>(())
    })();

    conn.execute("DETACH DATABASE src", [])
        .map_err(|e| e.to_string())?;
    let _ = std::fs::remove_file(&tmp_path);

    result?;

    // 5. Re-sign with the local key (imported integrity row was foreign).
    world::force_resign(conn, key)?;

    // 6. Return preview of the now-active world.
    let snap = world::read_world(conn)?.ok_or("NO_WORLD_AFTER_IMPORT".to_string())?;
    let identity = world::load_identity(conn)?.ok_or("NO_IDENTITY_AFTER_IMPORT".to_string())?;
    Ok(ImportPreview {
        world_name: identity.world_name,
        world_uuid: identity.world_uuid,
        created_at: identity.created_at,
        current_day: snap.current_day,
    })
}
