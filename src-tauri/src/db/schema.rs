use rusqlite::Connection;

pub fn init_schema(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS world_identity (
            world_uuid    TEXT    NOT NULL PRIMARY KEY,
            world_name    TEXT    NOT NULL,
            world_seed    INTEGER NOT NULL,
            created_at    INTEGER NOT NULL,
            bloom_version TEXT    NOT NULL
        );

        CREATE TABLE IF NOT EXISTS world_metadata (
            world_uuid      TEXT    NOT NULL PRIMARY KEY,
            world_name      TEXT    NOT NULL DEFAULT 'My Island',
            created_at      INTEGER NOT NULL,
            runtime_minutes INTEGER NOT NULL DEFAULT 0,
            current_day     INTEGER NOT NULL DEFAULT 1,
            growth_points   REAL    NOT NULL DEFAULT 0.0,
            island_stage    INTEGER NOT NULL DEFAULT 0,
            bloom_version   TEXT    NOT NULL DEFAULT '0.1.0'
        );

        CREATE TABLE IF NOT EXISTS world_tiles (
            tile_x       INTEGER NOT NULL,
            tile_y       INTEGER NOT NULL,
            grass_level  REAL    NOT NULL DEFAULT 0.0,
            created_at   INTEGER NOT NULL,
            updated_at   INTEGER NOT NULL,
            terrain_type TEXT    NOT NULL DEFAULT 'grass',
            PRIMARY KEY (tile_x, tile_y)
        );

        CREATE TABLE IF NOT EXISTS settings (
            id                  INTEGER NOT NULL PRIMARY KEY,
            startup_enabled     INTEGER NOT NULL DEFAULT 0,
            always_on_top       INTEGER NOT NULL DEFAULT 0,
            locked_position     INTEGER NOT NULL DEFAULT 0,
            island_scale        REAL    NOT NULL DEFAULT 1.0,
            hud_enabled         INTEGER NOT NULL DEFAULT 1,
            day_duration_min    INTEGER NOT NULL DEFAULT 20,
            night_duration_min  INTEGER NOT NULL DEFAULT 20,
            theme               TEXT    NOT NULL DEFAULT 'default'
        );

        CREATE TABLE IF NOT EXISTS activity_stats (
            id               INTEGER NOT NULL PRIMARY KEY,
            active_minutes   INTEGER NOT NULL DEFAULT 0,
            idle_minutes     INTEGER NOT NULL DEFAULT 0,
            keyboard_events  INTEGER NOT NULL DEFAULT 0,
            mouse_events     INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS world_integrity (
            id           INTEGER NOT NULL PRIMARY KEY,
            content_hash TEXT    NOT NULL,
            signature    TEXT    NOT NULL,
            public_key   TEXT    NOT NULL,
            signed_at    INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS ecosystem_milestones (
            milestone_id       TEXT    NOT NULL PRIMARY KEY,
            unlocked_bloom_day INTEGER NOT NULL,
            unlocked_at        INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS flowers (
            id          TEXT    NOT NULL PRIMARY KEY,
            tile_x      INTEGER NOT NULL,
            tile_y      INTEGER NOT NULL,
            offset_x    REAL    NOT NULL,
            offset_y    REAL    NOT NULL,
            flower_type TEXT    NOT NULL,
            created_at  INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS trees (
            id                   TEXT    NOT NULL PRIMARY KEY,
            tile_x               INTEGER NOT NULL,
            tile_y               INTEGER NOT NULL,
            offset_x             REAL    NOT NULL,
            offset_y             REAL    NOT NULL,
            species              TEXT    NOT NULL,
            stage                TEXT    NOT NULL,
            created_at_bloom_day INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS rocks (
            id                   TEXT    NOT NULL PRIMARY KEY,
            tile_x               INTEGER NOT NULL,
            tile_y               INTEGER NOT NULL,
            offset_x             REAL    NOT NULL,
            offset_y             REAL    NOT NULL,
            rock_type            TEXT    NOT NULL,
            created_at_bloom_day INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS pond (
            id                   INTEGER NOT NULL PRIMARY KEY,
            footprint            TEXT    NOT NULL,
            final_size           INTEGER NOT NULL,
            revealed_count       INTEGER NOT NULL,
            created_at_bloom_day INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS decorations (
            id              TEXT    NOT NULL PRIMARY KEY,
            decoration_type TEXT    NOT NULL,
            tile_x          INTEGER NOT NULL,
            tile_y          INTEGER NOT NULL
        );

        PRAGMA user_version = 9;
        ",
    )
    .map_err(|e| e.to_string())
}
