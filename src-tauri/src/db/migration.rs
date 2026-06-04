use rusqlite::Connection;
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

fn migrate_world_json(conn: &mut Connection, dir: &Path) -> bool {
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
            tiles.push(TileSnapshotIPC { tile_x, tile_y, grass_level });
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

    if world::insert_migrated_world(conn, &snap).is_ok() {
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

pub fn run_migration(conn: &mut Connection, dir: &Path) -> Result<(), String> {
    // World: migrate JSON only if no world row yet.
    if !world_exists(conn) {
        migrate_world_json(conn, dir);
    }

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
