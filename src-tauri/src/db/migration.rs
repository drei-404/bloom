use ed25519_dalek::SigningKey;
use rand_core::{OsRng, RngCore};
use rusqlite::{params, Connection};
use serde_json::Value;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use super::types::{SettingsSnapshotIPC, TileSnapshotIPC, WorldSnapshotIPC};
use super::{settings_db, world};

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

fn world_exists(conn: &Connection) -> bool {
    conn.query_row("SELECT COUNT(*) FROM world_metadata", [], |r| r.get::<_, i64>(0))
        .map(|c| c > 0)
        .unwrap_or(false)
}

fn settings_exist(conn: &Connection) -> bool {
    conn.query_row("SELECT COUNT(*) FROM settings WHERE id = 1", [], |r| r.get::<_, i64>(0))
        .map(|c| c > 0)
        .unwrap_or(false)
}

fn activity_exists(conn: &Connection) -> bool {
    conn.query_row("SELECT COUNT(*) FROM activity_stats WHERE id = 1", [], |r| {
        r.get::<_, i64>(0)
    })
    .map(|c| c > 0)
    .unwrap_or(false)
}

fn migrate_world_json(conn: &mut Connection, key: &SigningKey, dir: &Path) -> bool {
    let path = dir.join("world.json");
    let Ok(raw) = std::fs::read_to_string(&path) else {
        return false;
    };
    let Ok(json) = serde_json::from_str::<Value>(&raw) else {
        return false;
    };

    let total_ticks = json.get("totalTicks").and_then(Value::as_i64).unwrap_or(0);
    let day_count = json.get("dayCount").and_then(Value::as_i64).unwrap_or(1) as i32;
    let created_at = json.get("createdAt").and_then(Value::as_i64).unwrap_or(now_ms());
    let growth_points = json
        .get("totalActivityScore")
        .and_then(Value::as_f64)
        .unwrap_or(0.0);

    let mut tiles: Vec<TileSnapshotIPC> = vec![];
    if let Some(grid) = json.get("tileGrid").and_then(|g| g.get("tiles")).and_then(Value::as_array) {
        for t in grid {
            let tile_x = t.get("col").and_then(Value::as_i64).unwrap_or(0) as i32;
            let tile_y = t.get("row").and_then(Value::as_i64).unwrap_or(0) as i32;
            let grass_level = t.get("grassLevel").and_then(Value::as_f64).unwrap_or(0.0);
            tiles.push(TileSnapshotIPC {
                tile_x,
                tile_y,
                grass_level,
                terrain_type: "grass".to_string(),
            });
        }
    }

    let snap = WorldSnapshotIPC {
        world_uuid: None,
        world_name: "My Island".to_string(),
        created_at,
        runtime_minutes: total_ticks / 60,
        current_day: day_count,
        growth_points,
        bloom_version: "0.1.0".to_string(),
        tiles,
    };

    if world::insert_migrated_world(conn, key, &snap).is_ok() {
        let _ = std::fs::remove_file(&path);
        true
    } else {
        false
    }
}

fn migrate_settings_json(conn: &Connection, dir: &Path) -> bool {
    let path = dir.join("settings.json");
    let Ok(raw) = std::fs::read_to_string(&path) else {
        return false;
    };
    let Ok(json) = serde_json::from_str::<Value>(&raw) else {
        return false;
    };

    let snap = SettingsSnapshotIPC {
        startup_enabled: json.get("startWithWindows").and_then(Value::as_bool).unwrap_or(false),
        always_on_top: json.get("alwaysOnTop").and_then(Value::as_bool).unwrap_or(false),
        locked_position: json.get("lockPosition").and_then(Value::as_bool).unwrap_or(false),
        island_scale: json.get("islandScale").and_then(Value::as_f64).unwrap_or(1.0),
        hud_enabled: true,
        day_duration_min: json.get("dayDurationMinutes").and_then(Value::as_i64).unwrap_or(20),
        night_duration_min: json.get("nightDurationMinutes").and_then(Value::as_i64).unwrap_or(20),
        theme: json
            .get("theme")
            .and_then(Value::as_str)
            .unwrap_or("default")
            .to_string(),
    };

    if settings_db::save_settings(conn, &snap).is_ok() {
        let _ = std::fs::remove_file(&path);
        true
    } else {
        false
    }
}

fn default_settings() -> SettingsSnapshotIPC {
    SettingsSnapshotIPC {
        startup_enabled: false,
        always_on_top: false,
        locked_position: false,
        island_scale: 1.0,
        hud_enabled: true,
        day_duration_min: 20,
        night_duration_min: 20,
        theme: "default".to_string(),
    }
}

/// v1 → v2: legacy worlds stored identity in world_metadata with no seed.
/// Backfill world_identity preserving the existing uuid (identity never changes),
/// generating a seed for the world.
fn migrate_identity_v2(conn: &Connection) -> Result<(), String> {
    let identity_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM world_identity", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    if identity_count > 0 {
        return Ok(());
    }

    let legacy: Option<(String, String, i64, String)> = conn
        .query_row(
            "SELECT world_uuid, world_name, created_at, bloom_version
             FROM world_metadata LIMIT 1",
            [],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
        )
        .ok();

    if let Some((uuid, name, created, version)) = legacy {
        let seed = OsRng.next_u32() as i64;
        conn.execute(
            "INSERT INTO world_identity
             (world_uuid, world_name, world_seed, created_at, bloom_version)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![uuid, name, seed, created, version],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// v6 → v7: add terrain_type to world_tiles for legacy DBs (existing rows
/// backfill to 'grass'). Appended last so SELECT * column order stays aligned.
fn migrate_terrain_v7(conn: &Connection) -> Result<(), String> {
    let has_column: bool = conn
        .prepare("PRAGMA table_info(world_tiles)")
        .and_then(|mut stmt| {
            let cols = stmt
                .query_map([], |row| row.get::<_, String>(1))?
                .filter_map(|r| r.ok())
                .any(|name| name == "terrain_type");
            Ok(cols)
        })
        .map_err(|e| e.to_string())?;

    if !has_column {
        conn.execute(
            "ALTER TABLE world_tiles ADD COLUMN terrain_type TEXT NOT NULL DEFAULT 'grass'",
            [],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// v10 → v11: ensure the ecosystem identity / native species tables exist for
/// DBs created before the Ecosystem Identity system. `init_schema` also creates
/// them via CREATE TABLE IF NOT EXISTS; this is an explicit safety net. Content
/// is populated lazily on first world load (TypeScript, seeded from world_seed).
fn migrate_ecosystem_v11(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS ecosystem_identity (
            world_uuid TEXT    NOT NULL PRIMARY KEY,
            affinity   TEXT    NOT NULL,
            created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS native_species (
            species              TEXT    NOT NULL PRIMARY KEY,
            slot                 INTEGER NOT NULL,
            discovered           INTEGER NOT NULL DEFAULT 0,
            discovered_bloom_day INTEGER
        );
        ",
    )
    .map_err(|e| e.to_string())
}

pub fn run_migration(conn: &mut Connection, key: &SigningKey, dir: &Path) -> Result<(), String> {
    // Terrain: ensure world_tiles has terrain_type before any tile I/O (v6 → v7).
    migrate_terrain_v7(conn)?;

    // Ecosystem Identity tables (v10 → v11).
    migrate_ecosystem_v11(conn)?;

    // World: migrate JSON only if no world row yet.
    if !world_exists(conn) {
        migrate_world_json(conn, key, dir);
    }

    // Identity: backfill world_identity from legacy world_metadata (v1 → v2).
    migrate_identity_v2(conn)?;

    // Settings: migrate JSON, else seed defaults.
    if !settings_exist(conn) {
        if !migrate_settings_json(conn, dir) {
            settings_db::save_settings(conn, &default_settings())?;
        }
    }

    // Activity: seed empty row if missing.
    if !activity_exists(conn) {
        conn.execute(
            "INSERT OR IGNORE INTO activity_stats
             (id, active_minutes, idle_minutes, keyboard_events, mouse_events)
             VALUES (1, 0, 0, 0, 0)",
            [],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}
