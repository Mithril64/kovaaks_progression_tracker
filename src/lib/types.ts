export type Run = {
  id: number;
  scenarioId: number;
  scenarioName: string;
  score: number;
  accuracy?: number | null;
  kills?: number | null;
  weapon?: string | null;
  playedAt: string;
  sourceFile: string;
};

export type Scenario = {
  id: number;
  name: string;
  runCount: number;
  personalBest: number;
  lastPlayedAt: string | null;
};

export type Dashboard = {
  totalRuns: number;
  totalScenarios: number;
  lastImportAt: string | null;
  recentRuns: Run[];
  topScenarios: Scenario[];
};

export type ImportSummary = {
  imported: number;
  duplicates: number;
  failed: number;
  errors: string[];
};

export type RankThreshold = {
  rank: string;
  score: number;
};

export type BenchmarkScenario = {
  scenarioName: string;
  category: string;
  thresholds: RankThreshold[];
};

export type Benchmark = {
  id: string;
  name: string;
  season: string;
  scenarios: BenchmarkScenario[];
};

export type BenchmarkScenarioProgress = BenchmarkScenario & {
  personalBest: number | null;
  currentRank: string | null;
  nextRank: string | null;
  nextScoreNeeded: number | null;
};

export type BenchmarkProgress = {
  benchmark: Benchmark;
  scenarios: BenchmarkScenarioProgress[];
};
