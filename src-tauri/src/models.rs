#![cfg_attr(not(feature = "desktop"), allow(dead_code))]

use indexmap::IndexMap;
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillSlice {
    pub name: String,
    pub run_count: i64,
    pub scenario_count: i64,
    pub performance: f64,
    pub consistency: f64,
    pub avg_accuracy: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DistributionBucket {
    pub label: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityPoint {
    pub date: String,
    pub runs: i64,
    pub personal_bests: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScenarioInsight {
    pub id: i64,
    pub name: String,
    pub skill: String,
    pub run_count: i64,
    pub personal_best: f64,
    pub average_score: f64,
    pub recent_average: f64,
    pub improvement_percent: f64,
    pub consistency: f64,
    pub last_played_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalAnalytics {
    pub skill_slices: Vec<SkillSlice>,
    pub score_distribution: Vec<DistributionBucket>,
    pub accuracy_distribution: Vec<DistributionBucket>,
    pub activity: Vec<ActivityPoint>,
    pub most_improved: Vec<ScenarioInsight>,
    pub most_consistent: Vec<ScenarioInsight>,
    pub highest_volume: Vec<ScenarioInsight>,
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
pub struct BenchmarkSubcategory {
    pub subcategory_name: String,
    pub scenario_count: usize,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BenchmarkCategory {
    pub category_name: String,
    pub color: String,
    pub subcategories: Vec<BenchmarkSubcategory>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BenchmarkDifficulty {
    pub difficulty_name: String,
    pub kovaaks_benchmark_id: i64,
    pub sharecode: String,
    pub rank_colors: IndexMap<String, String>,
    pub categories: Vec<BenchmarkCategory>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Benchmark {
    #[serde(default)]
    pub id: String,
    pub benchmark_name: String,
    pub rank_calculation: String,
    pub abbreviation: Option<String>,
    pub color: Option<String>,
    #[serde(rename = "spreadsheetURL")]
    pub spreadsheet_url: Option<String>,
    pub date_added: Option<String>,
    pub difficulties: Vec<BenchmarkDifficulty>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BenchmarkProgress {
    pub benchmark: Benchmark,
    pub difficulties: Vec<BenchmarkDifficultyProgress>,
    pub scenarios: Vec<BenchmarkScenarioProgress>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BenchmarkDifficultyProgress {
    pub difficulty_name: String,
    pub kovaaks_benchmark_id: i64,
    pub sharecode: String,
    pub rank_colors: IndexMap<String, String>,
    pub resolved: bool,
    pub resolution_error: Option<String>,
    pub scenario_count: usize,
    pub resolved_scenario_count: usize,
    pub categories: Vec<BenchmarkCategoryProgress>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BenchmarkCategoryProgress {
    pub category_name: String,
    pub color: String,
    pub subcategories: Vec<BenchmarkSubcategoryProgress>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BenchmarkSubcategoryProgress {
    pub subcategory_name: String,
    pub color: String,
    pub scenario_count: usize,
    pub resolved_scenario_count: usize,
    pub scenarios: Vec<BenchmarkScenarioProgress>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BenchmarkScenarioProgress {
    pub scenario_name: String,
    pub category: String,
    pub subcategory: String,
    pub leaderboard_id: Option<i64>,
    pub thresholds: Vec<RankThreshold>,
    pub personal_best: Option<f64>,
    pub current_rank: Option<String>,
    pub next_rank: Option<String>,
    pub next_score_needed: Option<f64>,
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
