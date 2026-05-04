import { invoke } from "@tauri-apps/api/core";
import type { Benchmark, BenchmarkProgress, Dashboard, ImportSummary, Run, Scenario } from "./types";

type Command =
  | "detect_stats_folders"
  | "select_stats_folder"
  | "import_stats"
  | "get_dashboard"
  | "get_scenarios"
  | "get_scenario_runs"
  | "get_benchmarks"
  | "get_benchmark_progress";

const isTauri = () => "__TAURI_INTERNALS__" in window;

async function command<T>(name: Command, args?: Record<string, unknown>): Promise<T> {
  if (isTauri()) {
    return invoke<T>(name, args);
  }

  return mockCommand<T>(name, args);
}

const now = new Date().toISOString();

const mockRuns: Run[] = [
  {
    id: 1,
    scenarioId: 1,
    scenarioName: "1wall6targets small",
    score: 842.4,
    accuracy: 0.912,
    kills: 124,
    weapon: "Trainer",
    playedAt: now,
    sourceFile: "fixtures/stats/sample_1.csv",
  },
  {
    id: 2,
    scenarioId: 2,
    scenarioName: "Pasu Small Reload",
    score: 67.2,
    accuracy: 0.385,
    kills: 81,
    weapon: "Trainer",
    playedAt: now,
    sourceFile: "fixtures/stats/sample_2.csv",
  },
];

async function mockCommand<T>(name: Command, args?: Record<string, unknown>): Promise<T> {
  await new Promise((resolve) => window.setTimeout(resolve, 120));

  if (name === "get_dashboard") {
    return {
      totalRuns: 2,
      totalScenarios: 2,
      lastImportAt: now,
      recentRuns: mockRuns,
      topScenarios: [
        { id: 1, name: "1wall6targets small", runCount: 1, personalBest: 842.4, lastPlayedAt: now },
        { id: 2, name: "Pasu Small Reload", runCount: 1, personalBest: 67.2, lastPlayedAt: now },
      ],
    } as Dashboard as T;
  }

  if (name === "get_scenarios") {
    return [
      { id: 1, name: "1wall6targets small", runCount: 1, personalBest: 842.4, lastPlayedAt: now },
      { id: 2, name: "Pasu Small Reload", runCount: 1, personalBest: 67.2, lastPlayedAt: now },
    ] as Scenario[] as T;
  }

  if (name === "get_scenario_runs") {
    const scenarioId = Number(args?.scenarioId);
    return mockRuns.filter((run) => run.scenarioId === scenarioId) as T;
  }

  if (name === "get_benchmarks") {
    return [mockBenchmark] as Benchmark[] as T;
  }

  if (name === "get_benchmark_progress") {
    return {
      benchmark: mockBenchmark,
      scenarios: mockBenchmark.scenarios.map((scenario) => ({
        ...scenario,
        personalBest: scenario.scenarioName.includes("1wall") ? 842.4 : 67.2,
        currentRank: "Silver",
        nextRank: "Gold",
        nextScoreNeeded: scenario.scenarioName.includes("1wall") ? 57.6 : 7.8,
      })),
    } as BenchmarkProgress as T;
  }

  if (name === "import_stats") {
    return { imported: 0, duplicates: 0, failed: 0, errors: [] } as ImportSummary as T;
  }

  if (name === "detect_stats_folders") {
    return [] as T;
  }

  return null as T;
}

const mockBenchmark: Benchmark = {
  id: "starter-static",
  name: "Starter Static",
  season: "Local fixture",
  scenarios: [
    {
      scenarioName: "1wall6targets small",
      category: "Click Timing",
      thresholds: [
        { rank: "Bronze", score: 700 },
        { rank: "Silver", score: 800 },
        { rank: "Gold", score: 900 },
      ],
    },
    {
      scenarioName: "Pasu Small Reload",
      category: "Tracking",
      thresholds: [
        { rank: "Bronze", score: 55 },
        { rank: "Silver", score: 65 },
        { rank: "Gold", score: 75 },
      ],
    },
  ],
};

export const api = {
  detectStatsFolders: () => command<string[]>("detect_stats_folders"),
  selectStatsFolder: () => command<string | null>("select_stats_folder"),
  importStats: (folder: string) => command<ImportSummary>("import_stats", { folder }),
  getDashboard: () => command<Dashboard>("get_dashboard"),
  getScenarios: () => command<Scenario[]>("get_scenarios"),
  getScenarioRuns: (scenarioId: number) => command<Run[]>("get_scenario_runs", { scenarioId }),
  getBenchmarks: () => command<Benchmark[]>("get_benchmarks"),
  getBenchmarkProgress: (benchmarkId: string) =>
    command<BenchmarkProgress>("get_benchmark_progress", { benchmarkId }),
};
