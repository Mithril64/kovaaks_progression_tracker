#![cfg_attr(not(feature = "desktop"), allow(dead_code))]

use crate::{
    db::Database,
    models::{
        Benchmark, BenchmarkCategory, BenchmarkCategoryProgress, BenchmarkDifficulty,
        BenchmarkDifficultyProgress, BenchmarkProgress, BenchmarkScenarioProgress,
        BenchmarkSubcategoryProgress, RankThreshold,
    },
};
use anyhow::{anyhow, Result};
use indexmap::IndexMap;
use serde::Deserialize;
use std::time::Duration;

const DUMMY_STEAM_ID: &str = "76561198000000000";

pub fn bundled_benchmarks() -> Result<Vec<Benchmark>> {
    Ok(vec![
        load_benchmark(include_str!("../../fixtures/benchmarks/voltaic_s5.json"))?,
        load_benchmark(include_str!("../../fixtures/benchmarks/viscose_s2.json"))?,
        load_benchmark(include_str!(
            "../../fixtures/benchmarks/xyz_smoothness.json"
        ))?,
    ])
}

fn load_benchmark(json: &str) -> Result<Benchmark> {
    let mut benchmark: Benchmark = serde_json::from_str(json)?;
    benchmark.id = slugify(&benchmark.benchmark_name);
    Ok(benchmark)
}

pub fn benchmark_progress(
    db: &Database,
    benchmarks: &[Benchmark],
    benchmark_id: &str,
) -> Result<BenchmarkProgress> {
    let benchmark = benchmarks
        .iter()
        .find(|candidate| candidate.id == benchmark_id || candidate.benchmark_name == benchmark_id)
        .cloned()
        .ok_or_else(|| anyhow!("unknown benchmark: {benchmark_id}"))?;

    let mut difficulties = Vec::with_capacity(benchmark.difficulties.len());
    let mut scenarios = Vec::new();

    for difficulty in &benchmark.difficulties {
        let progress = difficulty_progress(db, difficulty)?;
        scenarios.extend(
            progress
                .categories
                .iter()
                .flat_map(|category| &category.subcategories)
                .flat_map(|subcategory| subcategory.scenarios.iter().cloned()),
        );
        difficulties.push(progress);
    }

    Ok(BenchmarkProgress {
        benchmark,
        difficulties,
        scenarios,
    })
}

fn difficulty_progress(
    db: &Database,
    difficulty: &BenchmarkDifficulty,
) -> Result<BenchmarkDifficultyProgress> {
    let expected_count = expected_scenario_count(&difficulty.categories);
    match fetch_kovaaks_benchmark_progress(difficulty.kovaaks_benchmark_id) {
        Ok(api_progress) => resolved_difficulty_progress(db, difficulty, api_progress),
        Err(error) => Ok(unresolved_difficulty_progress(
            difficulty,
            expected_count,
            error.to_string(),
        )),
    }
}

fn resolved_difficulty_progress(
    db: &Database,
    difficulty: &BenchmarkDifficulty,
    api_progress: KovaaksBenchmarkProgress,
) -> Result<BenchmarkDifficultyProgress> {
    let expected_count = expected_scenario_count(&difficulty.categories);
    let rank_names: Vec<String> = difficulty.rank_colors.keys().cloned().collect();
    let mut api_categories = api_progress.categories.into_iter();
    let mut categories = Vec::with_capacity(difficulty.categories.len());
    let mut resolved_scenario_count = 0;

    for category in &difficulty.categories {
        let mut subcategories = Vec::with_capacity(category.subcategories.len());

        for subcategory in &category.subcategories {
            let api_category = api_categories.next().map(|(_, value)| value);
            let mut scenarios = Vec::new();

            if let Some(api_category) = api_category {
                for (scenario_name, api_scenario) in api_category.scenarios {
                    let thresholds = scenario_thresholds(&rank_names, &api_scenario.rank_maxes);
                    let personal_best = db.personal_best_for_scenario(&scenario_name)?;
                    scenarios.push(scenario_progress(
                        scenario_name,
                        category.category_name.clone(),
                        subcategory.subcategory_name.trim().to_string(),
                        api_scenario.leaderboard_id,
                        thresholds,
                        personal_best,
                    ));
                }
            }

            resolved_scenario_count += scenarios.len();
            subcategories.push(BenchmarkSubcategoryProgress {
                subcategory_name: subcategory.subcategory_name.trim().to_string(),
                color: subcategory.color.clone(),
                scenario_count: subcategory.scenario_count,
                resolved_scenario_count: scenarios.len(),
                scenarios,
            });
        }

        categories.push(BenchmarkCategoryProgress {
            category_name: category.category_name.clone(),
            color: category.color.clone(),
            subcategories,
        });
    }

    Ok(BenchmarkDifficultyProgress {
        difficulty_name: difficulty.difficulty_name.clone(),
        kovaaks_benchmark_id: difficulty.kovaaks_benchmark_id,
        sharecode: difficulty.sharecode.clone(),
        rank_colors: difficulty.rank_colors.clone(),
        resolved: resolved_scenario_count > 0,
        resolution_error: None,
        scenario_count: expected_count,
        resolved_scenario_count,
        categories,
    })
}

fn unresolved_difficulty_progress(
    difficulty: &BenchmarkDifficulty,
    expected_count: usize,
    error: String,
) -> BenchmarkDifficultyProgress {
    BenchmarkDifficultyProgress {
        difficulty_name: difficulty.difficulty_name.clone(),
        kovaaks_benchmark_id: difficulty.kovaaks_benchmark_id,
        sharecode: difficulty.sharecode.clone(),
        rank_colors: difficulty.rank_colors.clone(),
        resolved: false,
        resolution_error: Some(error),
        scenario_count: expected_count,
        resolved_scenario_count: 0,
        categories: difficulty
            .categories
            .iter()
            .map(|category| BenchmarkCategoryProgress {
                category_name: category.category_name.clone(),
                color: category.color.clone(),
                subcategories: category
                    .subcategories
                    .iter()
                    .map(|subcategory| BenchmarkSubcategoryProgress {
                        subcategory_name: subcategory.subcategory_name.trim().to_string(),
                        color: subcategory.color.clone(),
                        scenario_count: subcategory.scenario_count,
                        resolved_scenario_count: 0,
                        scenarios: Vec::new(),
                    })
                    .collect(),
            })
            .collect(),
    }
}

fn scenario_progress(
    scenario_name: String,
    category: String,
    subcategory: String,
    leaderboard_id: Option<i64>,
    thresholds: Vec<RankThreshold>,
    personal_best: Option<f64>,
) -> BenchmarkScenarioProgress {
    let current_rank = personal_best.and_then(|pb| {
        thresholds
            .iter()
            .filter(|threshold| pb >= threshold.score)
            .last()
            .map(|threshold| threshold.rank.clone())
    });

    let next_threshold = personal_best
        .map(|pb| thresholds.iter().find(|threshold| pb < threshold.score))
        .unwrap_or_else(|| thresholds.first());

    BenchmarkScenarioProgress {
        scenario_name,
        category,
        subcategory,
        leaderboard_id,
        thresholds: thresholds.clone(),
        personal_best,
        current_rank,
        next_rank: next_threshold.map(|threshold| threshold.rank.clone()),
        next_score_needed: match (personal_best, next_threshold) {
            (Some(pb), Some(threshold)) => Some((threshold.score - pb).max(0.0)),
            (None, Some(threshold)) => Some(threshold.score),
            _ => None,
        },
    }
}

fn scenario_thresholds(rank_names: &[String], rank_maxes: &[f64]) -> Vec<RankThreshold> {
    rank_names
        .iter()
        .zip(rank_maxes.iter())
        .map(|(rank, score)| RankThreshold {
            rank: rank.clone(),
            score: *score,
        })
        .collect()
}

fn fetch_kovaaks_benchmark_progress(benchmark_id: i64) -> Result<KovaaksBenchmarkProgress> {
    let url = format!(
        "https://kovaaks.com/webapp-backend/benchmarks/player-progress-rank-benchmark?benchmarkId={benchmark_id}&steamId={DUMMY_STEAM_ID}"
    );
    let agent = ureq::AgentBuilder::new()
        .timeout(Duration::from_secs(12))
        .build();
    let response = agent
        .get(&url)
        .set("Accept", "application/json")
        .set("User-Agent", "kovaaks-progression-tracker/0.1")
        .call()?;
    Ok(response.into_json()?)
}

fn expected_scenario_count(categories: &[BenchmarkCategory]) -> usize {
    categories
        .iter()
        .flat_map(|category| &category.subcategories)
        .map(|subcategory| subcategory.scenario_count)
        .sum()
}

fn slugify(value: &str) -> String {
    let mut slug = String::new();
    let mut last_dash = false;

    for character in value.chars() {
        if character.is_ascii_alphanumeric() {
            slug.push(character.to_ascii_lowercase());
            last_dash = false;
        } else if !last_dash {
            slug.push('-');
            last_dash = true;
        }
    }

    slug.trim_matches('-').to_string()
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct KovaaksBenchmarkProgress {
    categories: IndexMap<String, KovaaksCategoryProgress>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct KovaaksCategoryProgress {
    scenarios: IndexMap<String, KovaaksScenarioProgress>,
}

#[derive(Debug, Deserialize)]
struct KovaaksScenarioProgress {
    #[serde(rename = "rank_maxes")]
    rank_maxes: Vec<f64>,
    #[serde(rename = "leaderboard_id")]
    leaderboard_id: Option<i64>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bundled_viscose_metadata_loads() {
        let benchmarks = bundled_benchmarks().expect("benchmarks load");
        let benchmark = benchmarks
            .iter()
            .find(|benchmark| benchmark.id == "viscose-benchmarks-s2")
            .expect("viscose exists");

        assert_eq!(benchmark.id, "viscose-benchmarks-s2");
        assert_eq!(benchmark.benchmark_name, "Viscose Benchmarks S2");
        assert_eq!(benchmark.difficulties.len(), 4);

        let scenario_count: usize = benchmark
            .difficulties
            .iter()
            .map(|difficulty| expected_scenario_count(&difficulty.categories))
            .sum();
        assert_eq!(scenario_count, 156);
    }

    #[test]
    fn bundled_library_includes_multiple_benchmarks() {
        let benchmarks = bundled_benchmarks().expect("benchmarks load");
        let ids: Vec<&str> = benchmarks
            .iter()
            .map(|benchmark| benchmark.id.as_str())
            .collect();

        assert_eq!(
            ids,
            vec!["voltaic-s5", "viscose-benchmarks-s2", "xyz-smoothness"]
        );
    }

    #[test]
    fn keeps_kovaaks_rank_maxes_on_display_score_scale() {
        let thresholds = scenario_thresholds(
            &["Cinnabar".to_string(), "Vermillion".to_string()],
            &[61.0, 72.0],
        );

        assert_eq!(thresholds[0].rank, "Cinnabar");
        assert_eq!(thresholds[0].score, 61.0);
        assert_eq!(thresholds[1].score, 72.0);
    }

    #[test]
    fn rank_progress_uses_thresholds_as_minimum_scores() {
        let thresholds = scenario_thresholds(
            &[
                "Cinnabar".to_string(),
                "Vermillion".to_string(),
                "Saffron".to_string(),
            ],
            &[61.0, 72.0, 83.0],
        );
        let progress = scenario_progress(
            "Smoothsphere Viscose Medium".to_string(),
            "Control Tracking".to_string(),
            "Arm".to_string(),
            Some(185342),
            thresholds,
            Some(64.0),
        );

        assert_eq!(progress.current_rank.as_deref(), Some("Cinnabar"));
        assert_eq!(progress.next_rank.as_deref(), Some("Vermillion"));
        assert_eq!(progress.next_score_needed, Some(8.0));
    }

    #[test]
    fn unresolved_progress_keeps_benchmark_shape() {
        let benchmarks = bundled_benchmarks().expect("benchmarks load");
        let viscose = benchmarks
            .iter()
            .find(|benchmark| benchmark.id == "viscose-benchmarks-s2")
            .expect("viscose exists");
        let mut difficulty = viscose.difficulties[0].clone();
        difficulty.kovaaks_benchmark_id = -1;

        let progress = unresolved_difficulty_progress(
            &difficulty,
            expected_scenario_count(&difficulty.categories),
            "network unavailable".to_string(),
        );

        assert!(!progress.resolved);
        assert_eq!(progress.resolved_scenario_count, 0);
        assert_eq!(progress.scenario_count, 39);
    }
}
