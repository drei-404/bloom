use ed25519_dalek::{Signature, Signer, SigningKey, VerifyingKey};
use rusqlite::{params, Connection, OptionalExtension};
use sha2::{Digest, Sha256};
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use super::types::WorldSnapshotIPC;

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

/// Load the Ed25519 signing key from disk, or generate + persist one on first run.
/// NOTE: key is stored locally alongside the save. This provides corruption and
/// casual-tamper detection, not protection against an attacker with disk access.
pub fn load_or_create_key(dir: &Path) -> Result<SigningKey, String> {
    let key_dir = dir.join("keys");
    std::fs::create_dir_all(&key_dir).map_err(|e| e.to_string())?;
    let path = key_dir.join("signing.key");

    if let Ok(hexstr) = std::fs::read_to_string(&path) {
        let bytes = hex::decode(hexstr.trim()).map_err(|e| e.to_string())?;
        let arr: [u8; 32] = bytes
            .try_into()
            .map_err(|_| "signing key has wrong length".to_string())?;
        return Ok(SigningKey::from_bytes(&arr));
    }

    let key = SigningKey::generate(&mut rand_core::OsRng);
    std::fs::write(&path, hex::encode(key.to_bytes())).map_err(|e| e.to_string())?;
    Ok(key)
}

/// Deterministic byte representation of world content for hashing/signing.
/// Tiles are sorted so ordering never affects the result.
fn canonical_bytes(snap: &WorldSnapshotIPC, stage: i32) -> Vec<u8> {
    let mut tiles = snap.tiles.clone();
    tiles.sort_by(|a, b| a.tile_x.cmp(&b.tile_x).then(a.tile_y.cmp(&b.tile_y)));

    let mut s = String::new();
    s.push_str(&format!(
        "{}|{}|{}|{}|{:.6}|{}|{}|",
        snap.world_uuid.clone().unwrap_or_default(),
        snap.created_at,
        snap.runtime_minutes,
        snap.current_day,
        snap.growth_points,
        stage,
        snap.bloom_version,
    ));
    for t in &tiles {
        s.push_str(&format!("{},{},{:.6};", t.tile_x, t.tile_y, t.grass_level));
    }
    s.into_bytes()
}

fn content_hash(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    hex::encode(hasher.finalize())
}

/// Sign the world content and upsert the integrity row (id = 1).
pub fn store_signature(
    conn: &Connection,
    key: &SigningKey,
    snap: &WorldSnapshotIPC,
    stage: i32,
) -> Result<(), String> {
    let bytes = canonical_bytes(snap, stage);
    let hash = content_hash(&bytes);
    let signature: Signature = key.sign(&bytes);
    let pubkey = key.verifying_key();

    conn.execute(
        "INSERT OR REPLACE INTO world_integrity
         (id, content_hash, signature, public_key, signed_at)
         VALUES (1, ?1, ?2, ?3, ?4)",
        params![
            hash,
            hex::encode(signature.to_bytes()),
            hex::encode(pubkey.to_bytes()),
            now_ms(),
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Verify the loaded world against the stored signature.
/// Returns Ok(true) if valid, Ok(false) if no integrity row exists yet,
/// Err("INTEGRITY_FAILURE") if the signature does not match.
pub fn verify(
    conn: &Connection,
    key: &SigningKey,
    snap: &WorldSnapshotIPC,
    stage: i32,
) -> Result<bool, String> {
    let row: Option<(String, String)> = conn
        .query_row(
            "SELECT signature, public_key FROM world_integrity WHERE id = 1",
            [],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    let (sig_hex, pubkey_hex) = match row {
        None => return Ok(false),
        Some(v) => v,
    };

    // Bind to the local key: a forged save re-signed with a different key fails here.
    let local_pubkey_hex = hex::encode(key.verifying_key().to_bytes());
    if pubkey_hex != local_pubkey_hex {
        return Err("INTEGRITY_FAILURE".to_string());
    }

    let sig_bytes = hex::decode(&sig_hex).map_err(|_| "INTEGRITY_FAILURE".to_string())?;
    let sig_arr: [u8; 64] = sig_bytes
        .try_into()
        .map_err(|_| "INTEGRITY_FAILURE".to_string())?;
    let signature = Signature::from_bytes(&sig_arr);

    let pk_bytes = hex::decode(&pubkey_hex).map_err(|_| "INTEGRITY_FAILURE".to_string())?;
    let pk_arr: [u8; 32] = pk_bytes
        .try_into()
        .map_err(|_| "INTEGRITY_FAILURE".to_string())?;
    let verifying_key =
        VerifyingKey::from_bytes(&pk_arr).map_err(|_| "INTEGRITY_FAILURE".to_string())?;

    let bytes = canonical_bytes(snap, stage);
    match verifying_key.verify_strict(&bytes, &signature) {
        Ok(()) => Ok(true),
        Err(_) => Err("INTEGRITY_FAILURE".to_string()),
    }
}
