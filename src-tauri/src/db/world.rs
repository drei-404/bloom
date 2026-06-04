use rusqlite::{params, Connection, OptionalExtension};
use std::time::{SystemTime, UNIX_EPOCH};

use super::types::{TileSnapshotIPC, WorldIdentityIPC, WorldSnapshotIPC};

const BLOOM_VERSION: &str = "0.1.0";

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

fn compute_stage(tiles: &[TileSnapshotIPC]) -> i32 {
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
            "INSERT INTO world_tiles (tile_x, tile_y, grass_level, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(tile_x, tile_y) DO UPDATE SET
                 grass_level = excluded.grass_level,
                 updated_at  = excluded.updated_at",
            params![tile.tile_x, tile.tile_y, tile.grass_level, now, now],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Create the immutable world identity row exactly once.
/// No-op if a world_metadata row already exists.
pub fn ensure_identity(conn: &Connection) -> Result<(), String> {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM world_metadata", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    if count == 0 {
        let uuid = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO world_metadata
             (world_uuid, world_name, created_at, runtime_minutes, current_day,
              growth_points, island_stage, bloom_version)
             VALUES (?1, ?2, ?3, 0, 1, 0.0, 0, ?4)",
            params![uuid, "My Island", now_ms(), BLOOM_VERSION],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Read the immutable identity fields.
pub fn load_identity(conn: &Connection) -> Result<Option<WorldIdentityIPC>, String> {
    conn.query_row(
        "SELECT world_uuid, world_name, created_at, bloom_version
         FROM world_metadata LIMIT 1",
        [],
        |row| {
            Ok(WorldIdentityIPC {
                world_uuid: row.get(0)?,
                world_name: row.get(1)?,
                created_at: row.get(2)?,
                bloom_version: row.get(3)?,
            })
        },
    )
    .optional()
    .map_err(|e| e.to_string())
}

/// Persist mutable world progression. Identity fields are never touched.
pub fn save_world(conn: &mut Connection, snap: &WorldSnapshotIPC) -> Result<(), String> {
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
    tx.commit().map_err(|e| e.to_string())
}

/// Full insert used only by JSON→SQLite migration to seed the first identity row.
pub fn insert_migrated_world(conn: &mut Connection, snap: &WorldSnapshotIPC) -> Result<(), String> {
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
    tx.commit().map_err(|e| e.to_string())
}

pub fn load_world(conn: &Connection) -> Result<Option<WorldSnapshotIPC>, String> {
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
        .prepare("SELECT tile_x, tile_y, grass_level FROM world_tiles")
        .map_err(|e| e.to_string())?;

    let tiles: Vec<TileSnapshotIPC> = stmt
        .query_map([], |row| {
            Ok(TileSnapshotIPC {
                tile_x: row.get(0)?,
                tile_y: row.get(1)?,
                grass_level: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    snap.tiles = tiles;
    Ok(Some(snap))
}
