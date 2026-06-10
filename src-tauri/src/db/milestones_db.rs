use rusqlite::{params, Connection};

use super::types::MilestoneRecordIPC;

pub fn load_milestones(conn: &Connection) -> Result<Vec<MilestoneRecordIPC>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT milestone_id, unlocked_bloom_day, unlocked_at
             FROM ecosystem_milestones
             ORDER BY unlocked_bloom_day ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(MilestoneRecordIPC {
                milestone_id: row.get(0)?,
                unlocked_bloom_day: row.get(1)?,
                unlocked_at: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(rows)
}

/// Insert a milestone unlock record. First write wins — re-unlocking is a no-op,
/// keeping the original unlock day/time stable.
pub fn save_milestone(conn: &Connection, rec: &MilestoneRecordIPC) -> Result<(), String> {
    conn.execute(
        "INSERT OR IGNORE INTO ecosystem_milestones
         (milestone_id, unlocked_bloom_day, unlocked_at)
         VALUES (?1, ?2, ?3)",
        params![rec.milestone_id, rec.unlocked_bloom_day, rec.unlocked_at],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
