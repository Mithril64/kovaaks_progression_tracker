use crate::models::{Dashboard, NewRun, Run, Scenario};
use anyhow::{Context, Result};
use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use std::path::Path;

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn open(path: impl AsRef<Path>) -> Result<Self> {
        let conn = Connection::open(path)?;
        conn.pragma_update(None, "foreign_keys", "ON")?;
        let db = Self { conn };
        db.migrate()?;
        Ok(db)
    }

    pub fn in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        conn.pragma_update(None, "foreign_keys", "ON")?;
        let db = Self { conn };
        db.migrate()?;
        Ok(db)
    }

    fn migrate(&self) -> Result<()> {
        self.conn.execute_batch(include_str!("../migrations/001_init.sql"))?;
        self.conn.execute(
            "INSERT OR IGNORE INTO migrations(version, applied_at) VALUES (1, ?1)",
            params![Utc::now().to_rfc3339()],
        )?;
        Ok(())
    }

    pub fn insert_run(&self, run: &NewRun) -> Result<bool> {
        if self
            .conn
            .query_row(
                "SELECT id FROM runs WHERE source_hash = ?1",
                params![run.source_hash],
                |row| row.get::<_, i64>(0),
            )
            .optional()?
            .is_some()
        {
            return Ok(false);
        }

        let scenario_id = self.get_or_create_scenario(&run.scenario_name)?;
        self.conn.execute(
            "INSERT INTO runs (
              scenario_id, score, accuracy, kills, weapon, played_at, source_file, source_hash, raw_json, imported_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                scenario_id,
                run.score,
                run.accuracy,
                run.kills,
                run.weapon,
                run.played_at,
                run.source_file,
                run.source_hash,
                run.raw_json,
                Utc::now().to_rfc3339()
            ],
        )?;
        self.set_setting("last_import_at", &Utc::now().to_rfc3339())?;
        Ok(true)
    }

    fn get_or_create_scenario(&self, name: &str) -> Result<i64> {
        let normalized = normalize_scenario(name);
        if let Some(id) = self
            .conn
            .query_row(
                "SELECT id FROM scenarios WHERE normalized_name = ?1",
                params![normalized],
                |row| row.get::<_, i64>(0),
            )
            .optional()?
        {
            return Ok(id);
        }

        self.conn.execute(
            "INSERT INTO scenarios(name, normalized_name, created_at) VALUES (?1, ?2, ?3)",
            params![name.trim(), normalized, Utc::now().to_rfc3339()],
        )?;
        Ok(self.conn.last_insert_rowid())
    }

    fn set_setting(&self, key: &str, value: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO settings(key, value, updated_at) VALUES (?1, ?2, ?3)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
            params![key, value, Utc::now().to_rfc3339()],
        )?;
        Ok(())
    }

    pub fn dashboard(&self) -> Result<Dashboard> {
        let total_runs = self
            .conn
            .query_row("SELECT COUNT(*) FROM runs", [], |row| row.get::<_, i64>(0))?;
        let total_scenarios =
            self.conn
                .query_row("SELECT COUNT(*) FROM scenarios", [], |row| row.get::<_, i64>(0))?;
        let last_import_at = self
            .conn
            .query_row(
                "SELECT value FROM settings WHERE key = 'last_import_at'",
                [],
                |row| row.get::<_, String>(0),
            )
            .optional()?;

        Ok(Dashboard {
            total_runs,
            total_scenarios,
            last_import_at,
            recent_runs: self.recent_runs(12)?,
            top_scenarios: self.scenarios(Some(8))?,
        })
    }

    pub fn scenarios(&self, limit: Option<usize>) -> Result<Vec<Scenario>> {
        let sql = format!(
            "SELECT
                s.id,
                s.name,
                COUNT(r.id) AS run_count,
                COALESCE(MAX(r.score), 0) AS personal_best,
                MAX(r.played_at) AS last_played_at
             FROM scenarios s
             LEFT JOIN runs r ON r.scenario_id = s.id
             GROUP BY s.id
             ORDER BY last_played_at DESC, s.name ASC
             {}",
            limit.map(|value| format!("LIMIT {}", value)).unwrap_or_default()
        );
        let mut stmt = self.conn.prepare(&sql)?;
        let scenarios = rows_to_scenarios(stmt.query_map([], row_to_scenario)?);
        scenarios
    }

    pub fn scenario_runs(&self, scenario_id: i64) -> Result<Vec<Run>> {
        let mut stmt = self.conn.prepare(
            "SELECT r.id, s.id, s.name, r.score, r.accuracy, r.kills, r.weapon, r.played_at, r.source_file
             FROM runs r
             JOIN scenarios s ON s.id = r.scenario_id
             WHERE s.id = ?1
             ORDER BY r.played_at DESC, r.id DESC",
        )?;
        let runs = rows_to_runs(stmt.query_map(params![scenario_id], row_to_run)?);
        runs
    }

    pub fn recent_runs(&self, limit: usize) -> Result<Vec<Run>> {
        let mut stmt = self.conn.prepare(
            "SELECT r.id, s.id, s.name, r.score, r.accuracy, r.kills, r.weapon, r.played_at, r.source_file
             FROM runs r
             JOIN scenarios s ON s.id = r.scenario_id
             ORDER BY r.played_at DESC, r.id DESC
             LIMIT ?1",
        )?;
        let runs = rows_to_runs(stmt.query_map(params![limit as i64], row_to_run)?);
        runs
    }

    pub fn personal_best_for_scenario(&self, scenario_name: &str) -> Result<Option<f64>> {
        self.conn
            .query_row(
                "SELECT MAX(r.score)
                 FROM runs r
                 JOIN scenarios s ON s.id = r.scenario_id
                 WHERE s.normalized_name = ?1",
                params![normalize_scenario(scenario_name)],
                |row| row.get::<_, Option<f64>>(0),
            )
            .optional()
            .map(|value| value.flatten())
            .context("load personal best")
    }
}

fn rows_to_runs(rows: impl Iterator<Item = rusqlite::Result<Run>>) -> Result<Vec<Run>> {
    rows.collect::<rusqlite::Result<Vec<_>>>().map_err(Into::into)
}

fn rows_to_scenarios(rows: impl Iterator<Item = rusqlite::Result<Scenario>>) -> Result<Vec<Scenario>> {
    rows.collect::<rusqlite::Result<Vec<_>>>().map_err(Into::into)
}

fn row_to_run(row: &rusqlite::Row<'_>) -> rusqlite::Result<Run> {
    Ok(Run {
        id: row.get(0)?,
        scenario_id: row.get(1)?,
        scenario_name: row.get(2)?,
        score: row.get(3)?,
        accuracy: row.get(4)?,
        kills: row.get(5)?,
        weapon: row.get(6)?,
        played_at: row.get(7)?,
        source_file: row.get(8)?,
    })
}

fn row_to_scenario(row: &rusqlite::Row<'_>) -> rusqlite::Result<Scenario> {
    Ok(Scenario {
        id: row.get(0)?,
        name: row.get(1)?,
        run_count: row.get(2)?,
        personal_best: row.get(3)?,
        last_played_at: row.get(4)?,
    })
}

pub fn normalize_scenario(name: &str) -> String {
    name.trim().to_ascii_lowercase().split_whitespace().collect::<Vec<_>>().join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parser::parse_stats_file;
    use std::path::Path;

    #[test]
    fn deduplicates_by_source_hash() {
        let db = Database::in_memory().expect("db opens");
        let run = parse_stats_file(Path::new("../fixtures/stats/1wall6targets_small.csv")).expect("fixture parses");

        assert!(db.insert_run(&run).expect("first insert succeeds"));
        assert!(!db.insert_run(&run).expect("duplicate is skipped"));

        let dashboard = db.dashboard().expect("dashboard loads");
        assert_eq!(dashboard.total_runs, 1);
        assert_eq!(dashboard.total_scenarios, 1);
    }
}
