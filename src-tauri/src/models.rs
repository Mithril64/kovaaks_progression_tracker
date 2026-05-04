#![cfg_attr(not(feature = "desktop"), allow(dead_code))]

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Run {
    pub id: i64,
    pub scenario_id: i64,
    pub scenario_name: String,
    pub score: f64,
    pub accuracy: Option<f64>,
    pub kills: Option<i64>,
    pub weapon: Option<String>,
    pub played_at: String,
    pub source_file: String,
}

#[derive(Debug, Clone)]
pub struct NewRun {
    pub scenario_name: String,
    pub score: f64,
    pub accuracy: Option<f64>,
    pub kills: Option<i64>,
    pub weapon: Option<String>,
    pub played_at: String,
    pub source_file: String,
    pub source_hash: String,
    pub raw_json: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Scenario {
    pub id: i64,
    pub name: String,
    pub run_count: i64,
    pub personal_best: f64,
    pub last_played_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Dashboard {
    pub total_runs: i64,
    pub total_scenarios: i64,
    pub last_import_at: Option<String>,
    pub recent_runs: Vec<Run>,
    pub top_scenarios: Vec<Scenario>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportSummary {
    pub imported: usize,
    pub duplicates: usize,
    pub failed: usize,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RankThreshold {
    pub rank: String,
    pub score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BenchmarkScenario {
    pub scenario_name: String,
    pub category: String,
    pub thresholds: Vec<RankThreshold>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Benchmark {
    pub id: String,
    pub name: String,
    pub season: String,
    pub scenarios: Vec<BenchmarkScenario>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BenchmarkScenarioProgress {
    pub scenario_name: String,
    pub category: String,
    pub thresholds: Vec<RankThreshold>,
    pub personal_best: Option<f64>,
    pub current_rank: Option<String>,
    pub next_rank: Option<String>,
    pub next_score_needed: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BenchmarkProgress {
    pub benchmark: Benchmark,
    pub scenarios: Vec<BenchmarkScenarioProgress>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OnlineProfile {
    pub provider: String,
    pub handle: String,
    pub display_name: Option<String>,
    pub last_synced_at: Option<String>,
    pub status: String,
}
