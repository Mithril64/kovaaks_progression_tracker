import { invoke } from "@tauri-apps/api/core";
import type { Benchmark, BenchmarkProgress, Dashboard, ImportSummary, LocalAnalytics, Run, Scenario } from "./types";

type Command =
  | "detect_stats_folders"
  | "select_stats_folder"
  | "import_stats"
  | "get_dashboard"
  | "get_local_analytics"
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

  if (name === "get_local_analytics") {
    return mockAnalytics as LocalAnalytics as T;
  }

  if (name === "get_scenario_runs") {
    const scenarioId = Number(args?.scenarioId);
    return mockRuns.filter((run) => run.scenarioId === scenarioId) as T;
  }

  if (name === "get_benchmarks") {
    return [mockBenchmark, mockVoltaicBenchmark, mockSmoothnessBenchmark] as Benchmark[] as T;
  }

  if (name === "get_benchmark_progress") {
    return {
      benchmark: mockBenchmark,
      difficulties: [
        {
          ...mockBenchmark.difficulties[0],
          resolved: true,
          resolutionError: null,
          scenarioCount: 6,
          resolvedScenarioCount: mockBenchmarkScenarios.length,
          categories: [
            {
              categoryName: "Control Tracking",
              color: "#434343",
              subcategories: [
                {
                  subcategoryName: "Arm",
                  color: "#666666",
                  scenarioCount: 3,
                  resolvedScenarioCount: mockBenchmarkScenarios.length,
                  scenarios: mockBenchmarkScenarios,
                },
              ],
            },
          ],
        },
      ],
      scenarios: mockBenchmarkScenarios,
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
  id: "viscose-benchmarks-s2",
  benchmarkName: "Viscose Benchmarks S2",
  rankCalculation: "basic",
  abbreviation: "V",
  color: "#ebbeff",
  spreadsheetURL: "https://docs.google.com/spreadsheets/d/1WeuEk444WOkTpvOGMYiertxwlI9gRQSapYiwxjFbT08/edit?usp=sharing",
  dateAdded: "2026-04-27",
  difficulties: [
    {
      difficultyName: "Medium",
      kovaaksBenchmarkId: 2336,
      sharecode: "KovaaKsPeakingNarrowImpact",
      rankColors: {
        Cinnabar: "#A71112",
        Vermillion: "#F85939",
        Saffron: "#F1C338",
        Celadon: "#9CFF91",
        Viridian: "#368b5c",
        Cerulean: "#02A4D3",
        Lavender: "#C2C2FF",
        Indigo: "#5C3896",
        Fuchsia: "#C74375",
      },
      categories: [
        {
          categoryName: "Control Tracking",
          color: "#434343",
          subcategories: [
            { subcategoryName: "Arm", scenarioCount: 3, color: "#666666" },
            { subcategoryName: "Wrist", scenarioCount: 3, color: "#666666" },
          ],
        },
      ],
    },
  ],
};

const mockVoltaicBenchmark: Benchmark = {
  ...mockBenchmark,
  id: "voltaic-s5",
  benchmarkName: "Voltaic S5",
  rankCalculation: "vt-energy",
  abbreviation: "VT",
  color: "#02A2DA",
  dateAdded: "2025-05-30",
};

const mockSmoothnessBenchmark: Benchmark = {
  ...mockBenchmark,
  id: "xyz-smoothness",
  benchmarkName: "xyz Smoothness",
  rankCalculation: "xyz",
  abbreviation: "xyz",
  color: "#A2A9AA",
  dateAdded: "2026-04-30",
};

const mockBenchmarkScenarios = [
  {
    scenarioName: "Smoothsphere Viscose Medium",
    category: "Control Tracking",
    subcategory: "Arm",
    leaderboardId: 185342,
    thresholds: [
      { rank: "Cinnabar", score: 61 },
      { rank: "Vermillion", score: 72 },
      { rank: "Saffron", score: 83 },
    ],
    personalBest: 64,
    currentRank: "Cinnabar",
    nextRank: "Vermillion",
    nextScoreNeeded: 8,
  },
  {
    scenarioName: "VT Controlsphere Viscose Medium",
    category: "Control Tracking",
    subcategory: "Arm",
    leaderboardId: 184157,
    thresholds: [
      { rank: "Cinnabar", score: 11 },
      { rank: "Vermillion", score: 16 },
      { rank: "Saffron", score: 21 },
    ],
    personalBest: null,
    currentRank: null,
    nextRank: "Cinnabar",
    nextScoreNeeded: 11,
  },
];

const mockAnalytics: LocalAnalytics = {
  skillSlices: [
    { name: "Static Clicking", runCount: 8, scenarioCount: 3, performance: 86, consistency: 91, avgAccuracy: 0.78 },
    { name: "Tracking", runCount: 6, scenarioCount: 2, performance: 73, consistency: 84, avgAccuracy: 0.62 },
    { name: "Target Switching", runCount: 4, scenarioCount: 2, performance: 68, consistency: 79, avgAccuracy: 0.58 },
  ],
  scoreDistribution: [
    { label: "<50%", count: 0 },
    { label: "50-60", count: 0 },
    { label: "60-70", count: 1 },
    { label: "70-80", count: 1 },
    { label: "80-90", count: 2 },
    { label: "90-95", count: 2 },
    { label: "95-99", count: 1 },
    { label: "PB", count: 2 },
  ],
  accuracyDistribution: [
    { label: "<50%", count: 1 },
    { label: "50-60", count: 1 },
    { label: "60-70", count: 2 },
    { label: "70-80", count: 2 },
    { label: "80-90", count: 1 },
    { label: "90-95", count: 1 },
    { label: "95+", count: 0 },
  ],
  activity: [
    { date: "2026-04-28", runs: 2, personalBests: 1 },
    { date: "2026-04-29", runs: 4, personalBests: 2 },
    { date: "2026-04-30", runs: 3, personalBests: 1 },
    { date: "2026-05-01", runs: 5, personalBests: 2 },
  ],
  mostImproved: [
    {
      id: 1,
      name: "1wall6targets small",
      skill: "Static Clicking",
      runCount: 5,
      personalBest: 842.4,
      averageScore: 801.2,
      recentAverage: 829.1,
      improvementPercent: 18.4,
      consistency: 92,
      lastPlayedAt: now,
    },
  ],
  mostConsistent: [
    {
      id: 2,
      name: "Pasu Small Reload",
      skill: "Dynamic Clicking",
      runCount: 4,
      personalBest: 67.2,
      averageScore: 64.8,
      recentAverage: 66.1,
      improvementPercent: 8.2,
      consistency: 88,
      lastPlayedAt: now,
    },
  ],
  highestVolume: [
    {
      id: 1,
      name: "1wall6targets small",
      skill: "Static Clicking",
      runCount: 5,
      personalBest: 842.4,
      averageScore: 801.2,
      recentAverage: 829.1,
      improvementPercent: 18.4,
      consistency: 92,
      lastPlayedAt: now,
    },
  ],
};

export const api = {
  detectStatsFolders: () => command<string[]>("detect_stats_folders"),
  selectStatsFolder: () => command<string | null>("select_stats_folder"),
  importStats: (folder: string) => command<ImportSummary>("import_stats", { folder }),
  getDashboard: () => command<Dashboard>("get_dashboard"),
  getLocalAnalytics: () => command<LocalAnalytics>("get_local_analytics"),
  getScenarios: () => command<Scenario[]>("get_scenarios"),
  getScenarioRuns: (scenarioId: number) => command<Run[]>("get_scenario_runs", { scenarioId }),
  getBenchmarks: () => command<Benchmark[]>("get_benchmarks"),
  getBenchmarkProgress: (benchmarkId: string) =>
    command<BenchmarkProgress>("get_benchmark_progress", { benchmarkId }),
};
