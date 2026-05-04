use crate::models::NewRun;
use anyhow::{anyhow, Context, Result};
use chrono::{DateTime, Local, NaiveDateTime, TimeZone, Utc};
use csv::StringRecord;
use serde_json::json;
use sha2::{Digest, Sha256};
use std::{collections::HashMap, fs, path::Path};

pub fn parse_stats_file(path: &Path) -> Result<NewRun> {
    let bytes = fs::read(path).with_context(|| format!("read {}", path.display()))?;
    let source_hash = format!("{:x}", Sha256::digest(&bytes));
    let text = String::from_utf8_lossy(&bytes);

    parse_csv_like(path, &text, &source_hash).or_else(|csv_error| {
        parse_key_value(path, &text, &source_hash)
            .with_context(|| format!("{}; key-value fallback also failed", csv_error))
    })
}

fn parse_csv_like(path: &Path, text: &str, source_hash: &str) -> Result<NewRun> {
    let mut reader = csv::ReaderBuilder::new()
        .flexible(true)
        .trim(csv::Trim::All)
        .from_reader(text.as_bytes());
    let headers = reader.headers()?.clone();
    let record = reader
        .records()
        .next()
        .transpose()?
        .ok_or_else(|| anyhow!("missing CSV data row"))?;
    let fields = headers_to_map(&headers, &record);
    build_run(path, source_hash, fields)
}

fn parse_key_value(path: &Path, text: &str, source_hash: &str) -> Result<NewRun> {
    let mut fields = HashMap::new();
    for line in text.lines() {
        let Some((key, value)) = line.split_once(':').or_else(|| line.split_once('=')) else {
            continue;
        };
        let value = value.trim().trim_start_matches(',').trim();
        fields.insert(normalize_key(key), value.to_string());
    }
    build_run(path, source_hash, fields)
}

fn headers_to_map(headers: &StringRecord, record: &StringRecord) -> HashMap<String, String> {
    headers
        .iter()
        .zip(record.iter())
        .map(|(key, value)| (normalize_key(key), value.trim().to_string()))
        .collect()
}

fn build_run(path: &Path, source_hash: &str, fields: HashMap<String, String>) -> Result<NewRun> {
    let scenario_name = first_string(
        &fields,
        &[
            "scenario",
            "scenario_name",
            "challenge",
            "challenge_name",
            "map",
            "map_name",
        ],
    )
    .or_else(|| scenario_from_filename(path))
    .ok_or_else(|| anyhow!("missing scenario name"))?;

    let score = first_f64(
        &fields,
        &["score", "final_score", "high_score", "score_damage"],
    )
    .ok_or_else(|| anyhow!("missing score"))?;

    let accuracy = first_f64(&fields, &["accuracy", "acc", "avg_accuracy"])
        .map(normalize_accuracy)
        .or_else(|| derive_accuracy(&fields));
    let kills = first_i64(&fields, &["kills", "kill_count", "targets_killed"]);
    let weapon = first_string(&fields, &["weapon", "weapon_name"]);
    let played_at = first_string(
        &fields,
        &["played_at", "date", "datetime", "timestamp", "time"],
    )
    .and_then(|value| parse_time(&value).ok())
    .or_else(|| timestamp_from_filename(path))
    .unwrap_or_else(|| file_modified_at(path));

    let raw_json = serde_json::to_string(&json!(fields))?;

    Ok(NewRun {
        scenario_name,
        score,
        accuracy,
        kills,
        weapon,
        played_at,
        source_file: path.to_string_lossy().to_string(),
        source_hash: source_hash.to_string(),
        raw_json,
    })
}

fn normalize_key(key: &str) -> String {
    key.trim()
        .to_ascii_lowercase()
        .replace([' ', '-', '/', '.'], "_")
        .trim_matches('_')
        .to_string()
}

fn first_string(fields: &HashMap<String, String>, keys: &[&str]) -> Option<String> {
    keys.iter()
        .filter_map(|key| fields.get(*key))
        .map(|value| value.trim())
        .find(|value| !value.is_empty())
        .map(ToString::to_string)
}

fn first_f64(fields: &HashMap<String, String>, keys: &[&str]) -> Option<f64> {
    first_string(fields, keys).and_then(|value| value.replace('%', "").parse::<f64>().ok())
}

fn first_i64(fields: &HashMap<String, String>, keys: &[&str]) -> Option<i64> {
    first_string(fields, keys).and_then(|value| value.parse::<i64>().ok())
}

fn normalize_accuracy(value: f64) -> f64 {
    if value > 1.0 {
        value / 100.0
    } else {
        value
    }
}

fn derive_accuracy(fields: &HashMap<String, String>) -> Option<f64> {
    let hits = first_f64(fields, &["hit_count", "hits", "damage_done"])?;
    let attempts = first_f64(fields, &["shots", "damage_possible"])
        .or_else(|| first_f64(fields, &["miss_count", "misses"]).map(|misses| hits + misses))?;

    (attempts > 0.0).then(|| (hits / attempts).clamp(0.0, 1.0))
}

fn parse_time(value: &str) -> Result<String> {
    if let Ok(parsed) = DateTime::parse_from_rfc3339(value) {
        return Ok(parsed.with_timezone(&Utc).to_rfc3339());
    }

    for format in [
        "%Y.%m.%d-%H.%M.%S",
        "%Y-%m-%d %H:%M:%S",
        "%Y/%m/%d %H:%M:%S",
        "%m/%d/%Y %H:%M:%S",
    ] {
        if let Ok(parsed) = NaiveDateTime::parse_from_str(value, format) {
            let local = Local
                .from_local_datetime(&parsed)
                .single()
                .ok_or_else(|| anyhow!("ambiguous local timestamp"))?;
            return Ok(local.with_timezone(&Utc).to_rfc3339());
        }
    }

    Err(anyhow!("unsupported timestamp"))
}

fn file_modified_at(path: &Path) -> String {
    fs::metadata(path)
        .and_then(|metadata| metadata.modified())
        .map(DateTime::<Utc>::from)
        .unwrap_or_else(|_| Utc::now())
        .to_rfc3339()
}

fn scenario_from_filename(path: &Path) -> Option<String> {
    let stem = path.file_stem()?.to_string_lossy();
    let scenario = stem
        .split(" - ")
        .next()
        .unwrap_or(&stem)
        .replace('_', " ")
        .trim()
        .to_string();
    (!scenario.is_empty()).then_some(scenario)
}

fn timestamp_from_filename(path: &Path) -> Option<String> {
    let stem = path.file_stem()?.to_string_lossy();
    let timestamp = stem
        .rsplit(" - ")
        .next()
        .unwrap_or(&stem)
        .strip_suffix(" Stats")
        .unwrap_or(&stem);
    parse_time(timestamp).ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_fixture_csv() {
        let path = Path::new("../fixtures/stats/1wall6targets_small.csv");
        let run = parse_stats_file(path).expect("fixture parses");
        assert_eq!(run.scenario_name, "1wall6targets small");
        assert_eq!(run.score, 842.4);
        assert_eq!(run.accuracy, Some(0.912));
    }

    #[test]
    fn parses_kovaaks_summary_lines_with_colon_comma_values() {
        let run = parse_key_value(
            Path::new("1w2ts Perfected - Challenge - 2026.04.08-01.20.51 Stats.csv"),
            "Kills:,64\nHit Count:,64\nMiss Count:,11\nScore:,64.0\nScenario:,1w2ts Perfected\n",
            "hash",
        )
        .expect("summary parses");

        assert_eq!(run.scenario_name, "1w2ts Perfected");
        assert_eq!(run.score, 64.0);
        assert_eq!(run.kills, Some(64));
        assert_eq!(run.accuracy, Some(64.0 / 75.0));
        DateTime::parse_from_rfc3339(&run.played_at).expect("filename timestamp is RFC3339");
    }
}
