#![cfg_attr(not(feature = "desktop"), allow(dead_code))]

use crate::{
    db::Database,
    models::{Benchmark, BenchmarkProgress, BenchmarkScenarioProgress},
};
use anyhow::{anyhow, Result};

pub fn bundled_benchmarks() -> Result<Vec<Benchmark>> {
    let starter = include_str!("../../fixtures/benchmarks/starter_static.json");
    Ok(vec![serde_json::from_str(starter)?])
}

pub fn benchmark_progress(db: &Database, benchmarks: &[Benchmark], benchmark_id: &str) -> Result<BenchmarkProgress> {
    let benchmark = benchmarks
        .iter()
        .find(|candidate| candidate.id == benchmark_id)
        .cloned()
        .ok_or_else(|| anyhow!("unknown benchmark: {benchmark_id}"))?;

    let mut scenarios = Vec::with_capacity(benchmark.scenarios.len());
    for scenario in &benchmark.scenarios {
        let personal_best = db.personal_best_for_scenario(&scenario.scenario_name)?;
        let mut sorted_thresholds = scenario.thresholds.clone();
        sorted_thresholds.sort_by(|left, right| left.score.total_cmp(&right.score));

        let current_rank = personal_best.and_then(|pb| {
            sorted_thresholds
                .iter()
                .filter(|threshold| pb >= threshold.score)
                .last()
                .map(|threshold| threshold.rank.clone())
        });

        let next_threshold = personal_best
            .map(|pb| sorted_thresholds.iter().find(|threshold| pb < threshold.score))
            .unwrap_or_else(|| sorted_thresholds.first());

        scenarios.push(BenchmarkScenarioProgress {
            scenario_name: scenario.scenario_name.clone(),
            category: scenario.category.clone(),
            thresholds: scenario.thresholds.clone(),
            personal_best,
            current_rank,
            next_rank: next_threshold.map(|threshold| threshold.rank.clone()),
            next_score_needed: match (personal_best, next_threshold) {
                (Some(pb), Some(threshold)) => Some((threshold.score - pb).max(0.0)),
                (None, Some(threshold)) => Some(threshold.score),
                _ => None,
            },
        });
    }

    Ok(BenchmarkProgress { benchmark, scenarios })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{db::Database, parser::parse_stats_file};
    use std::path::Path;

    #[test]
    fn calculates_next_rank() {
        let db = Database::in_memory().expect("db opens");
        let run = parse_stats_file(Path::new("../fixtures/stats/1wall6targets_small.csv")).expect("fixture parses");
        db.insert_run(&run).expect("insert succeeds");
        let benchmarks = bundled_benchmarks().expect("benchmarks load");

        let progress = benchmark_progress(&db, &benchmarks, "starter-static").expect("progress loads");
        let static_scenario = progress
            .scenarios
            .iter()
            .find(|scenario| scenario.scenario_name == "1wall6targets small")
            .expect("scenario exists");

        assert_eq!(static_scenario.current_rank.as_deref(), Some("Silver"));
        assert_eq!(static_scenario.next_rank.as_deref(), Some("Gold"));
    }
}
