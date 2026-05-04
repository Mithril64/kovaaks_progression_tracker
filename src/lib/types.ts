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

export type SkillSlice = {
  name: string;
  runCount: number;
  scenarioCount: number;
  performance: number;
  consistency: number;
  avgAccuracy: number | null;
};

export type DistributionBucket = {
  label: string;
  count: number;
};

export type ActivityPoint = {
  date: string;
  runs: number;
  personalBests: number;
};

export type ScenarioInsight = {
  id: number;
  name: string;
  skill: string;
  runCount: number;
  personalBest: number;
  averageScore: number;
  recentAverage: number;
  improvementPercent: number;
  consistency: number;
  lastPlayedAt: string | null;
};

export type LocalAnalytics = {
  skillSlices: SkillSlice[];
  scoreDistribution: DistributionBucket[];
  accuracyDistribution: DistributionBucket[];
  activity: ActivityPoint[];
  mostImproved: ScenarioInsight[];
  mostConsistent: ScenarioInsight[];
  highestVolume: ScenarioInsight[];
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

export type BenchmarkSubcategory = {
  subcategoryName: string;
  scenarioCount: number;
  color: string;
};

export type BenchmarkCategory = {
  categoryName: string;
  color: string;
  subcategories: BenchmarkSubcategory[];
};

export type BenchmarkDifficulty = {
  difficultyName: string;
  kovaaksBenchmarkId: number;
  sharecode: string;
  rankColors: Record<string, string>;
  categories: BenchmarkCategory[];
};

export type Benchmark = {
  id: string;
  benchmarkName: string;
  rankCalculation: string;
  abbreviation?: string | null;
  color?: string | null;
  spreadsheetURL?: string | null;
  dateAdded?: string | null;
  difficulties: BenchmarkDifficulty[];
};

export type BenchmarkScenarioProgress = {
  scenarioName: string;
  category: string;
  subcategory: string;
  leaderboardId: number | null;
  thresholds: RankThreshold[];
  personalBest: number | null;
  currentRank: string | null;
  nextRank: string | null;
  nextScoreNeeded: number | null;
};

export type BenchmarkProgress = {
  benchmark: Benchmark;
  difficulties: BenchmarkDifficultyProgress[];
  scenarios: BenchmarkScenarioProgress[];
};

export type BenchmarkDifficultyProgress = {
  difficultyName: string;
  kovaaksBenchmarkId: number;
  sharecode: string;
  rankColors: Record<string, string>;
  resolved: boolean;
  resolutionError: string | null;
  scenarioCount: number;
  resolvedScenarioCount: number;
  categories: BenchmarkCategoryProgress[];
};

export type BenchmarkCategoryProgress = {
  categoryName: string;
  color: string;
  subcategories: BenchmarkSubcategoryProgress[];
};

export type BenchmarkSubcategoryProgress = {
  subcategoryName: string;
  color: string;
  scenarioCount: number;
  resolvedScenarioCount: number;
  scenarios: BenchmarkScenarioProgress[];
};
