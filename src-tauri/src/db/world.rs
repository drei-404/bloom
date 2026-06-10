use ed25519_dalek::SigningKey;
use rand_core::{OsRng, RngCore};
use rusqlite::{params, Connection, OptionalExtension};
use std::time::{SystemTime, UNIX_EPOCH};

use super::integrity;
use super::types::{TileSnapshotIPC, WorldIdentityIPC, WorldSnapshotIPC};

const BLOOM_VERSION: &str = "0.1.0";

const NAME_ADJECTIVES: &[&str] = &[
    "Emerald", "Verdant", "Golden", "Misty", "Silent", "Hidden", "Amber", "Crystal",
    "Whispering", "Sunny", "Mossy", "Quiet", "Wild", "Gentle", "Dewy", "Lush",
];
const NAME_NOUNS: &[&str] = &[
    "Grove", "Meadow", "Hollow", "Glade", "Haven", "Vale", "Thicket", "Garden",
    "Glen", "Bloom", "Field", "Refuge", "Knoll", "Dell", "Spinney", "Acre",
];

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

fn gen_world_uuid() -> String {
    let n = OsRng.next_u32();
    format!("BLOOM-WLD-{:08X}", n)
}

fn gen_world_seed() -> i64 {
    OsRng.next_u32() as i64
}

fn gen_world_name() -> String {
    let adj = NAME_ADJECTIVES[(OsRng.next_u32() as usize) % NAME_ADJECTIVES.len()];
    let noun = NAME_NOUNS[(OsRng.next_u32() as usize) % NAME_NOUNS.len()];
    format!("{} {}", adj, noun)
}

pub fn compute_stage(tiles: &[TileSnapshotIPC]) -> i32 {
    if tiles.is_empty() {
        return 0;
    }
    let avg = tiles.iter().map(|t| t.grass_level).sum::<f64>() / tiles.len() as f64;
    if avg < 0.05 {
        0
    } else if avg < 0.25 {
        1
    } else if avg < 0.50 {
        2
    } else if avg < 0.80 {
        3
    } else {
        4
    }
}

fn upsert_tiles(tx: &rusqlite::Transaction, tiles: &[TileSnapshotIPC]) -> Result<(), String> {
    let now = now_ms();
    for tile in tiles {
        tx.execute(
            "INSERT INTO world_tiles (tile_x, tile_y, grass_level, created_at, updated_at, terrain_type)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(tile_x, tile_y) DO UPDATE SET
                 grass_level  = excluded.grass_level,
                 updated_at   = excluded.updated_at,
                 terrain_type = excluded.terrain_type",
            params![tile.tile_x, tile.tile_y, tile.grass_level, now, now, tile.terrain_type],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Create the permanent world identity exactly once, then ensure the
/// world_metadata progression row mirrors it. Identity never changes once set.
pub fn ensure_identity(conn: &Connection) -> Result<(), String> {
    let identity_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM world_identity", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;

    if identity_count == 0 {
        let uuid = gen_world_uuid();
        let name = gen_world_name();
        let seed = gen_world_seed();
        let created = now_ms();
        conn.execute(
            "INSERT INTO world_identity
             (world_uuid, world_name, world_seed, created_at, bloom_version)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![uuid, name, seed, created, BLOOM_VERSION],
        )
        .map_err(|e| e.to_string())?;
    }

    // Mirror identity into world_metadata (integrity + export read from there).
    let meta_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM world_metadata", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    if meta_count == 0 {
        let id = load_identity(conn)?.ok_or("NO_IDENTITY".to_string())?;
        conn.execute(
            "INSERT INTO world_metadata
             (world_uuid, world_name, created_at, runtime_minutes, current_day,
              growth_points, island_stage, bloom_version)
             VALUES (?1, ?2, ?3, 0, 1, 0.0, 0, ?4)",
            params![id.world_uuid, id.world_name, id.created_at, id.bloom_version],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// Read the permanent identity (uuid, name, seed, created, version).
pub fn load_identity(conn: &Connection) -> Result<Option<WorldIdentityIPC>, String> {
    conn.query_row(
        "SELECT world_uuid, world_name, world_seed, created_at, bloom_version
         FROM world_identity LIMIT 1",
        [],
        |row| {
            Ok(WorldIdentityIPC {
                world_uuid: row.get(0)?,
                world_name: row.get(1)?,
                world_seed: row.get(2)?,
                created_at: row.get(3)?,
                bloom_version: row.get(4)?,
            })
        },
    )
    .optional()
    .map_err(|e| e.to_string())
}

/// Persist mutable world progression. Identity fields are never touched.
/// Every save regenerates the content hash + Ed25519 signature.
pub fn save_world(
    conn: &mut Connection,
    key: &SigningKey,
    snap: &WorldSnapshotIPC,
) -> Result<(), String> {
    let stage = compute_stage(&snap.tiles);
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // Single identity row — UPDATE mutable columns only.
    tx.execute(
        "UPDATE world_metadata SET
            runtime_minutes = ?1,
            current_day     = ?2,
            growth_points   = ?3,
            island_stage    = ?4",
        params![snap.runtime_minutes, snap.current_day, snap.growth_points, stage],
    )
    .map_err(|e| e.to_string())?;

    upsert_tiles(&tx, &snap.tiles)?;
    integrity::store_signature(&tx, key, snap, stage)?;
    tx.commit().map_err(|e| e.to_string())
}

/// Full insert used only by JSON→SQLite migration to seed the first identity row.
/// Signs the migrated content so the first load verifies cleanly.
pub fn insert_migrated_world(
    conn: &mut Connection,
    key: &SigningKey,
    snap: &WorldSnapshotIPC,
) -> Result<(), String> {
    let uuid = snap
        .world_uuid
        .clone()
        .filter(|u| !u.is_empty())
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
    let stage = compute_stage(&snap.tiles);
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT OR REPLACE INTO world_metadata
         (world_uuid, world_name, created_at, runtime_minutes, current_day,
          growth_points, island_stage, bloom_version)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            uuid,
            snap.world_name,
            snap.created_at,
            snap.runtime_minutes,
            snap.current_day,
            snap.growth_points,
            stage,
            snap.bloom_version,
        ],
    )
    .map_err(|e| e.to_string())?;

    upsert_tiles(&tx, &snap.tiles)?;

    // Sign with the resolved uuid (snap may have carried None).
    let mut signed_snap = snap.clone();
    signed_snap.world_uuid = Some(uuid);
    integrity::store_signature(&tx, key, &signed_snap, stage)?;

    tx.commit().map_err(|e| e.to_string())
}

/// Sign the current world content if a metadata row exists but no signature does.
/// Runs once at startup so migrated / pre-integrity saves verify on first load.
pub fn ensure_signed(conn: &Connection, key: &SigningKey) -> Result<(), String> {
    let has_meta: i64 = conn
        .query_row("SELECT COUNT(*) FROM world_metadata", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    if has_meta == 0 {
        return Ok(());
    }
    let has_sig: i64 = conn
        .query_row("SELECT COUNT(*) FROM world_integrity WHERE id = 1", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    if has_sig > 0 {
        return Ok(());
    }
    if let Some(snap) = read_world(conn)? {
        let stage = compute_stage(&snap.tiles);
        integrity::store_signature(conn, key, &snap, stage)?;
    }
    Ok(())
}

/// Re-sign current world content with the local key, discarding any prior signature.
/// Used after import: the imported save was signed by a different machine's key.
pub fn force_resign(conn: &Connection, key: &SigningKey) -> Result<(), String> {
    conn.execute("DELETE FROM world_integrity", [])
        .map_err(|e| e.to_string())?;
    if let Some(snap) = read_world(conn)? {
        let stage = compute_stage(&snap.tiles);
        integrity::store_signature(conn, key, &snap, stage)?;
    }
    Ok(())
}

/// Read world content without integrity verification (internal use).
pub fn read_world(conn: &Connection) -> Result<Option<WorldSnapshotIPC>, String> {
    let meta: Option<WorldSnapshotIPC> = conn
        .query_row(
            "SELECT world_uuid, world_name, created_at, runtime_minutes, current_day,
                    growth_points, bloom_version
             FROM world_metadata LIMIT 1",
            [],
            |row| {
                Ok(WorldSnapshotIPC {
                    world_uuid: Some(row.get(0)?),
                    world_name: row.get(1)?,
                    created_at: row.get(2)?,
                    runtime_minutes: row.get(3)?,
                    current_day: row.get(4)?,
                    growth_points: row.get(5)?,
                    bloom_version: row.get(6)?,
                    tiles: vec![],
                })
            },
        )
        .optional()
        .map_err(|e| e.to_string())?;

    let mut snap = match meta {
        None => return Ok(None),
        Some(s) => s,
    };

    let mut stmt = conn
        .prepare("SELECT tile_x, tile_y, grass_level, terrain_type FROM world_tiles")
        .map_err(|e| e.to_string())?;

    let tiles: Vec<TileSnapshotIPC> = stmt
        .query_map([], |row| {
            Ok(TileSnapshotIPC {
                tile_x: row.get(0)?,
                tile_y: row.get(1)?,
                grass_level: row.get(2)?,
                terrain_type: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    snap.tiles = tiles;
    Ok(Some(snap))
}

/// Load world content and verify its Ed25519 signature.
/// Returns Err("INTEGRITY_FAILURE") if the stored signature does not match.
pub fn load_world(
    conn: &Connection,
    key: &SigningKey,
) -> Result<Option<WorldSnapshotIPC>, String> {
    let snap = match read_world(conn)? {
        None => return Ok(None),
        Some(s) => s,
    };
    let stage = compute_stage(&snap.tiles);
    // verify() returns false only when no signature row exists (legacy); accept that.
    integrity::verify(conn, key, &snap, stage)?;
    Ok(Some(snap))
}
