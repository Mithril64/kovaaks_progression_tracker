use crate::models::{
    ActivityPoint, Dashboard, DistributionBucket, LocalAnalytics, NewRun, Run, Scenario,
    ScenarioInsight, SkillSlice,
};
use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use serde_json::Value;
use std::cmp::Ordering;
use std::collections::{BTreeMap, HashMap, HashSet};
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
        self.conn
            .execute_batch(include_str!("../migrations/001_init.sql"))?;
        self.conn.execute(
            "INSERT OR IGNORE INTO migrations(version, applied_at) VALUES (1, ?1)",
            params![Utc::now().to_rfc3339()],
        )?;
        self.backfill_derived_accuracy()?;
        Ok(())
    }

    fn backfill_derived_accuracy(&self) -> Result<()> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, raw_json FROM runs WHERE accuracy IS NULL")?;
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?))
        })?;
        let updates = rows.collect::<rusqlite::Result<Vec<_>>>()?;

        for (id, raw_json) in updates {
            let Some(accuracy) = accuracy_from_raw_json(&raw_json) else {
                continue;
            };
            self.conn.execute(
                "UPDATE runs SET accuracy = ?1 WHERE id = ?2",
                params![accuracy, id],
            )?;
        }

        Ok(())
    }

    pub fn insert_run(&self, run: &NewRun) -> Result<bool> {
        if let Some(id) = self
            .conn
            .query_row(
                "SELECT id FROM runs WHERE source_hash = ?1",
                params![run.source_hash],
                |row| row.get::<_, i64>(0),
            )
            .optional()?
        {
            self.conn.execute(
                "UPDATE runs
                 SET accuracy = COALESCE(accuracy, ?2),
                     kills = COALESCE(kills, ?3),
                     weapon = COALESCE(weapon, ?4),
                     raw_json = ?5
                 WHERE id = ?1",
                params![id, run.accuracy, run.kills, run.weapon, run.raw_json],
            )?;
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
        let total_scenarios = self
            .conn
            .query_row("SELECT COUNT(*) FROM scenarios", [], |row| {
                row.get::<_, i64>(0)
            })?;
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
            limit
                .map(|value| format!("LIMIT {}", value))
                .unwrap_or_default()
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

    pub fn local_analytics(&self) -> Result<LocalAnalytics> {
        let runs = self.all_runs_chronological()?;
        Ok(build_local_analytics(&runs))
    }

    fn all_runs_chronological(&self) -> Result<Vec<Run>> {
        let mut stmt = self.conn.prepare(
            "SELECT r.id, s.id, s.name, r.score, r.accuracy, r.kills, r.weapon, r.played_at, r.source_file
             FROM runs r
             JOIN scenarios s ON s.id = r.scenario_id
             ORDER BY r.played_at ASC, r.id ASC",
        )?;
        let runs = rows_to_runs(stmt.query_map([], row_to_run)?);
        runs
    }
}

fn build_local_analytics(runs: &[Run]) -> LocalAnalytics {
    let scenario_best = scenario_bests(runs);
    let scenario_insights = scenario_insights(runs);
    let skill_slices = skill_slices(runs, &scenario_best);

    let mut most_improved = scenario_insights.clone();
    most_improved.sort_by(|a, b| sort_desc(a.improvement_percent, b.improvement_percent));

    let mut most_consistent = scenario_insights.clone();
    most_consistent.sort_by(|a, b| {
        sort_desc(a.consistency, b.consistency).then_with(|| b.run_count.cmp(&a.run_count))
    });

    let mut highest_volume = scenario_insights.clone();
    highest_volume.sort_by(|a, b| b.run_count.cmp(&a.run_count));

    LocalAnalytics {
        skill_slices,
        score_distribution: score_distribution(runs, &scenario_best),
        accuracy_distribution: accuracy_distribution(runs),
        activity: activity_points(runs),
        most_improved: most_improved.into_iter().take(8).collect(),
        most_consistent: most_consistent.into_iter().take(8).collect(),
        highest_volume: highest_volume.into_iter().take(8).collect(),
    }
}

fn scenario_bests(runs: &[Run]) -> HashMap<i64, f64> {
    let mut bests = HashMap::new();
    for run in runs {
        bests
            .entry(run.scenario_id)
            .and_modify(|best| {
                if run.score > *best {
                    *best = run.score;
                }
            })
            .or_insert(run.score);
    }
    bests
}

fn skill_slices(runs: &[Run], scenario_best: &HashMap<i64, f64>) -> Vec<SkillSlice> {
    let mut grouped: BTreeMap<String, Vec<&Run>> = BTreeMap::new();
    for run in runs {
        grouped
            .entry(infer_skill(&run.scenario_name))
            .or_default()
            .push(run);
    }

    grouped
        .into_iter()
        .map(|(name, runs)| {
            let scenario_count = runs
                .iter()
                .map(|run| run.scenario_id)
                .collect::<HashSet<_>>()
                .len() as i64;
            let ratios = runs
                .iter()
                .filter_map(|run| {
                    scenario_best
                        .get(&run.scenario_id)
                        .map(|best| run.score / best.max(1.0))
                })
                .collect::<Vec<_>>();
            let accuracies = runs
                .iter()
                .filter_map(|run| run.accuracy)
                .collect::<Vec<_>>();

            SkillSlice {
                name,
                run_count: runs.len() as i64,
                scenario_count,
                performance: (mean(&ratios) * 100.0).clamp(0.0, 100.0),
                consistency: consistency(&ratios) * 100.0,
                avg_accuracy: (!accuracies.is_empty()).then(|| mean(&accuracies)),
            }
        })
        .collect()
}

fn score_distribution(runs: &[Run], scenario_best: &HashMap<i64, f64>) -> Vec<DistributionBucket> {
    let mut counts = vec![0_i64; 8];
    for run in runs {
        let Some(best) = scenario_best.get(&run.scenario_id) else {
            continue;
        };
        let pct = (run.score / best.max(1.0)) * 100.0;
        let index = match pct {
            value if value < 50.0 => 0,
            value if value < 60.0 => 1,
            value if value < 70.0 => 2,
            value if value < 80.0 => 3,
            value if value < 90.0 => 4,
            value if value < 95.0 => 5,
            value if value < 100.0 => 6,
            _ => 7,
        };
        counts[index] += 1;
    }

    [
        "<50%", "50-60", "60-70", "70-80", "80-90", "90-95", "95-99", "PB",
    ]
    .into_iter()
    .zip(counts)
    .map(|(label, count)| DistributionBucket {
        label: label.to_string(),
        count,
    })
    .collect()
}

fn accuracy_distribution(runs: &[Run]) -> Vec<DistributionBucket> {
    let mut counts = vec![0_i64; 7];
    for accuracy in runs.iter().filter_map(|run| run.accuracy) {
        let pct = accuracy * 100.0;
        let index = match pct {
            value if value < 50.0 => 0,
            value if value < 60.0 => 1,
            value if value < 70.0 => 2,
            value if value < 80.0 => 3,
            value if value < 90.0 => 4,
            value if value < 95.0 => 5,
            _ => 6,
        };
        counts[index] += 1;
    }

    ["<50%", "50-60", "60-70", "70-80", "80-90", "90-95", "95+"]
        .into_iter()
        .zip(counts)
        .map(|(label, count)| DistributionBucket {
            label: label.to_string(),
            count,
        })
        .collect()
}

fn activity_points(runs: &[Run]) -> Vec<ActivityPoint> {
    let mut days: BTreeMap<String, (i64, i64)> = BTreeMap::new();
    let mut bests: HashMap<i64, f64> = HashMap::new();

    for run in runs {
        let date = DateTime::parse_from_rfc3339(&run.played_at)
            .map(|parsed| parsed.date_naive().to_string())
            .unwrap_or_else(|_| run.played_at.chars().take(10).collect());
        let best = bests.entry(run.scenario_id).or_insert(f64::NEG_INFINITY);
        let is_pb = run.score > *best;
        if is_pb {
            *best = run.score;
        }

        let entry = days.entry(date).or_insert((0, 0));
        entry.0 += 1;
        if is_pb {
            entry.1 += 1;
        }
    }

    days.into_iter()
        .rev()
        .take(30)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .map(|(date, (runs, personal_bests))| ActivityPoint {
            date,
            runs,
            personal_bests,
        })
        .collect()
}

fn scenario_insights(runs: &[Run]) -> Vec<ScenarioInsight> {
    let mut grouped: BTreeMap<i64, Vec<&Run>> = BTreeMap::new();
    for run in runs {
        grouped.entry(run.scenario_id).or_default().push(run);
    }

    grouped
        .into_iter()
        .filter_map(|(id, runs)| {
            let first = *runs.first()?;
            let scores = runs.iter().map(|run| run.score).collect::<Vec<_>>();
            let personal_best = scores.iter().copied().fold(f64::NEG_INFINITY, f64::max);
            let average_score = mean(&scores);
            let recent = runs
                .iter()
                .rev()
                .take(5)
                .map(|run| run.score)
                .collect::<Vec<_>>();
            let first_score = first.score.max(1.0);
            let last_played_at = runs.last().map(|run| run.played_at.clone());

            Some(ScenarioInsight {
                id,
                name: first.scenario_name.clone(),
                skill: infer_skill(&first.scenario_name),
                run_count: runs.len() as i64,
                personal_best,
                average_score,
                recent_average: mean(&recent),
                improvement_percent: ((personal_best - first_score) / first_score) * 100.0,
                consistency: consistency(&scores) * 100.0,
                last_played_at,
            })
        })
        .collect()
}

fn infer_skill(name: &str) -> String {
    let normalized = name.to_ascii_lowercase();
    if contains_any(
        &normalized,
        &[
            "smooth",
            "sphere",
            "air",
            "ground",
            "control",
            "tracking",
            "whisphere",
        ],
    ) {
        "Tracking".to_string()
    } else if contains_any(&normalized, &["switch", "ts", "targetswitch", "vox", "ww"]) {
        "Target Switching".to_string()
    } else if contains_any(
        &normalized,
        &["pasu", "bounce", "flicker", "reflex", "reactive", "evasive"],
    ) {
        "Dynamic Clicking".to_string()
    } else if contains_any(
        &normalized,
        &["1w", "static", "microshot", "click", "smallflick"],
    ) {
        "Static Clicking".to_string()
    } else if contains_any(&normalized, &["straf", "dodge", "kin", "popcorn"]) {
        "Movement".to_string()
    } else {
        "Mixed".to_string()
    }
}

fn contains_any(value: &str, needles: &[&str]) -> bool {
    needles.iter().any(|needle| value.contains(needle))
}

fn mean(values: &[f64]) -> f64 {
    if values.is_empty() {
        0.0
    } else {
        values.iter().sum::<f64>() / values.len() as f64
    }
}

fn consistency(values: &[f64]) -> f64 {
    if values.len() < 2 {
        return 1.0;
    }
    let avg = mean(values);
    if avg <= f64::EPSILON {
        return 0.0;
    }
    let variance = values
        .iter()
        .map(|value| {
            let delta = value - avg;
            delta * delta
        })
        .sum::<f64>()
        / values.len() as f64;
    (1.0 - (variance.sqrt() / avg)).clamp(0.0, 1.0)
}

fn sort_desc(a: f64, b: f64) -> Ordering {
    b.partial_cmp(&a).unwrap_or(Ordering::Equal)
}

fn accuracy_from_raw_json(raw_json: &str) -> Option<f64> {
    let fields = serde_json::from_str::<Value>(raw_json).ok()?;
    let hits = json_f64(&fields, &["hit_count", "hits", "damage_done"])?;
    let attempts = json_f64(&fields, &["shots", "damage_possible"])
        .or_else(|| json_f64(&fields, &["miss_count", "misses"]).map(|misses| hits + misses))?;

    (attempts > 0.0).then(|| (hits / attempts).clamp(0.0, 1.0))
}

fn json_f64(fields: &Value, keys: &[&str]) -> Option<f64> {
    keys.iter().find_map(|key| {
        fields
            .get(*key)
            .and_then(Value::as_str)
            .and_then(|value| value.parse::<f64>().ok())
            .or_else(|| fields.get(*key).and_then(Value::as_f64))
    })
}

fn rows_to_runs(rows: impl Iterator<Item = rusqlite::Result<Run>>) -> Result<Vec<Run>> {
    rows.collect::<rusqlite::Result<Vec<_>>>()
        .map_err(Into::into)
}

fn rows_to_scenarios(
    rows: impl Iterator<Item = rusqlite::Result<Scenario>>,
) -> Result<Vec<Scenario>> {
    rows.collect::<rusqlite::Result<Vec<_>>>()
        .map_err(Into::into)
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
    name.trim()
        .to_ascii_lowercase()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parser::parse_stats_file;
    use std::path::Path;

    #[test]
    fn deduplicates_by_source_hash() {
        let db = Database::in_memory().expect("db opens");
        let run = parse_stats_file(Path::new("../fixtures/stats/1wall6targets_small.csv"))
            .expect("fixture parses");

        assert!(db.insert_run(&run).expect("first insert succeeds"));
        assert!(!db.insert_run(&run).expect("duplicate is skipped"));

        let dashboard = db.dashboard().expect("dashboard loads");
        assert_eq!(dashboard.total_runs, 1);
        assert_eq!(dashboard.total_scenarios, 1);
    }

    #[test]
    fn builds_local_analytics_from_imported_runs() {
        let db = Database::in_memory().expect("db opens");
        for path in [
            "../fixtures/stats/1wall6targets_small.csv",
            "../fixtures/stats/pasu_small_reload.csv",
        ] {
            let run = parse_stats_file(Path::new(path)).expect("fixture parses");
            db.insert_run(&run).expect("insert succeeds");
        }

        let analytics = db.local_analytics().expect("analytics loads");
        assert!(!analytics.skill_slices.is_empty());
        assert_eq!(
            analytics
                .score_distribution
                .iter()
                .map(|bucket| bucket.count)
                .sum::<i64>(),
            2
        );
        assert!(!analytics.highest_volume.is_empty());
    }

    #[test]
    fn duplicate_import_backfills_missing_accuracy() {
        let db = Database::in_memory().expect("db opens");
        let mut run = parse_stats_file(Path::new("../fixtures/stats/1wall6targets_small.csv"))
            .expect("fixture parses");
        run.accuracy = None;
        assert!(db.insert_run(&run).expect("insert succeeds"));

        let mut reparsed = run.clone();
        reparsed.accuracy = Some(0.85);
        assert!(!db
            .insert_run(&reparsed)
            .expect("duplicate updates missing fields"));

        let scenario = db.scenarios(Some(1)).expect("scenario loads").remove(0);
        let runs = db.scenario_runs(scenario.id).expect("runs load");
        assert_eq!(runs[0].accuracy, Some(0.85));
    }
}
