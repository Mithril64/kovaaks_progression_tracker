import { Link } from "@tanstack/react-router";
import { BarChart3, BookOpen, ExternalLink, Play } from "lucide-react";
import { useMemo, useState } from "react";
import { useBenchmarkProgress, useBenchmarks, useScenarios } from "../lib/queries";
import type {
  Benchmark,
  BenchmarkCategoryProgress,
  BenchmarkDifficultyProgress,
  BenchmarkScenarioProgress,
  BenchmarkSubcategoryProgress,
} from "../lib/types";

type BenchmarkRow = {
  category: BenchmarkCategoryProgress;
  categorySpan: number;
  showCategory: boolean;
  subcategory: BenchmarkSubcategoryProgress;
  subcategorySpan: number;
  showSubcategory: boolean;
  scenario: BenchmarkScenarioProgress | null;
};

export function BenchmarksPage() {
  const benchmarks = useBenchmarks();
  const localScenarios = useScenarios();
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | undefined>(undefined);
  const selectedBenchmark = benchmarks.data?.find((benchmark) => benchmark.id === selectedId);
  const progress = useBenchmarkProgress(selectedId);

  const activeDifficulty =
    progress.data?.difficulties.find((difficulty) => difficulty.difficultyName === selectedDifficulty) ??
    progress.data?.difficulties[0];

  const localScenarioIds = useMemo(() => {
    const ids = new Map<string, number>();
    for (const scenario of localScenarios.data ?? []) {
      ids.set(scenario.name.toLowerCase(), scenario.id);
    }
    return ids;
  }, [localScenarios.data]);

  const totals = useMemo(() => {
    const scenarios = activeDifficulty?.categories.flatMap((category) =>
      category.subcategories.flatMap((subcategory) => subcategory.scenarios),
    );
    const played = scenarios?.filter((scenario) => scenario.personalBest != null).length ?? 0;
    const ranked = scenarios?.filter((scenario) => scenario.currentRank != null).length ?? 0;
    return { played, ranked, total: scenarios?.length ?? 0 };
  }, [activeDifficulty]);

  return (
    <div className="space-y-4">
      <section className="rounded border border-slate-700 bg-slate-900 p-4 shadow-card">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">Benchmark Library</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-50">
              {selectedBenchmark?.benchmarkName ?? "Select a benchmark"}
            </h2>
            <p className="text-sm text-slate-300">
              Browse bundled benchmark metadata first; Kovaak scenario resolution starts only after selection.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
            <Stat label="Benchmarks" value={String(benchmarks.data?.length ?? 0)} />
            <Stat label="Selected" value={selectedBenchmark?.abbreviation ?? "-"} />
            <Stat label="Lookup" value={selectedId ? (progress.isFetching ? "Resolving" : "Ready") : "Idle"} />
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(benchmarks.data ?? []).map((benchmark) => (
          <BenchmarkCard
            key={benchmark.id}
            benchmark={benchmark}
            selected={benchmark.id === selectedId}
            onSelect={() => {
              setSelectedId(benchmark.id);
              setSelectedDifficulty(undefined);
            }}
          />
        ))}
      </section>

      {progress.data ? (
        <section className="rounded border border-slate-700 bg-slate-900 p-4 shadow-card">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {progress.data.difficulties.map((difficulty) => (
                <button
                  key={difficulty.difficultyName}
                  type="button"
                  className={`rounded border px-3 py-2 text-sm font-semibold ${
                    activeDifficulty?.difficultyName === difficulty.difficultyName
                      ? "border-cyan-300 bg-cyan-400 text-slate-950"
                      : "border-slate-700 bg-slate-800 text-slate-200 hover:border-slate-500"
                  }`}
                  onClick={() => setSelectedDifficulty(difficulty.difficultyName)}
                >
                  {difficulty.difficultyName}
                </button>
              ))}
            </div>
            {activeDifficulty ? (
              <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
                <Stat label="Resolved" value={`${activeDifficulty.resolvedScenarioCount}/${activeDifficulty.scenarioCount}`} />
                <Stat label="Played" value={`${totals.played}/${totals.total}`} />
                <Stat label="Ranked" value={`${totals.ranked}/${totals.total}`} />
              </div>
            ) : null}
          </div>
          {activeDifficulty ? <DifficultyMeta difficulty={activeDifficulty} /> : null}
        </section>
      ) : null}

      {activeDifficulty?.resolutionError ? (
        <section className="rounded border border-orange-400 bg-slate-900 p-4 text-sm text-orange-200 shadow-card">
          Could not resolve scenarios from Kovaak right now: {activeDifficulty.resolutionError}
        </section>
      ) : null}

      {activeDifficulty ? (
        <BenchmarkRankTable difficulty={activeDifficulty} localScenarioIds={localScenarioIds} />
      ) : null}

      {progress.isError ? (
        <section className="rounded border border-orange-400 bg-slate-900 p-4 text-sm text-orange-300 shadow-card">
          Benchmark progress failed to load.
        </section>
      ) : null}

      {!selectedId ? (
        <section className="rounded border border-slate-700 bg-slate-900 p-4 text-sm text-slate-400 shadow-card">
          Select a benchmark above to resolve its Kovaak scenarios and compare the thresholds against your local PBs.
        </section>
      ) : null}
    </div>
  );
}

function BenchmarkCard({
  benchmark,
  selected,
  onSelect,
}: {
  benchmark: Benchmark;
  selected: boolean;
  onSelect: () => void;
}) {
  const scenarioCount = benchmark.difficulties.reduce(
    (total, difficulty) =>
      total +
      difficulty.categories.reduce(
        (categoryTotal, category) =>
          categoryTotal +
          category.subcategories.reduce((subcategoryTotal, subcategory) => subcategoryTotal + subcategory.scenarioCount, 0),
        0,
      ),
    0,
  );
  const difficultyNames = benchmark.difficulties.map((difficulty) => difficulty.difficultyName).join(", ");

  return (
    <button
      type="button"
      className={`rounded border bg-slate-900 p-4 text-left shadow-card transition ${
        selected ? "border-cyan-300 ring-1 ring-cyan-300" : "border-slate-700 hover:border-slate-500"
      }`}
      onClick={onSelect}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {benchmark.abbreviation ?? benchmark.rankCalculation}
          </p>
          <h3 className="truncate text-base font-semibold text-slate-50">{benchmark.benchmarkName}</h3>
        </div>
        <span className="h-4 w-4 shrink-0 rounded-sm" style={{ backgroundColor: benchmark.color ?? "#22d3ee" }} />
      </div>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <CardMetric label="Difficulties" value={benchmark.difficulties.length} />
        <CardMetric label="Scenarios" value={scenarioCount} />
        <CardMetric label="Added" value={benchmark.dateAdded?.slice(0, 4) ?? "-"} />
      </div>
      <p className="mt-3 line-clamp-2 text-xs text-slate-400">{difficultyNames}</p>
    </button>
  );
}

function CardMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-950 px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function BenchmarkRankTable({
  difficulty,
  localScenarioIds,
}: {
  difficulty: BenchmarkDifficultyProgress;
  localScenarioIds: Map<string, number>;
}) {
  const rankEntries = Object.entries(difficulty.rankColors);
  const rows = useMemo(() => buildRows(difficulty), [difficulty]);

  if (rows.length === 0) {
    return (
      <section className="rounded border border-slate-700 bg-slate-900 p-4 text-sm text-slate-400 shadow-card">
        Scenario names will appear after Kovaak API resolution succeeds.
      </section>
    );
  }

  return (
    <section className="w-full max-w-full overflow-hidden rounded border border-slate-700 bg-[#1b1b1c] shadow-card">
      <div className="flex flex-col gap-3 border-b border-slate-700 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-100">
            {difficulty.difficultyName} Rank Table
          </h3>
          <p className="text-xs text-slate-400">
            Scores are your local PBs; rank bands are Kovaak benchmark thresholds.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {rankEntries.map(([rank, color]) => (
            <span
              key={rank}
              className="inline-flex items-center gap-1.5 rounded border border-white/10 bg-slate-950 px-2 py-1 text-xs font-semibold text-slate-100"
            >
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
              {rank}
            </span>
          ))}
        </div>
      </div>

      <div className="max-w-full overflow-x-auto overflow-y-hidden">
        <table className="w-max min-w-full border-collapse text-left text-xs">
          <thead className="bg-[#111112] text-[11px] uppercase tracking-[0.14em] text-slate-200">
            <tr>
              <th className="w-7 border-b border-slate-700 px-2 py-2" />
              <th className="w-8 border-b border-slate-700 px-2 py-2" />
              <th className="border-b border-slate-700 px-3 py-2">Scenario</th>
              <th className="w-28 border-b border-slate-700 px-3 py-2 text-right">Score</th>
              <th className="w-16 border-b border-slate-700 px-2 py-2 text-center">
                <BarChart3 size={14} aria-label="Rank progress" />
              </th>
              {rankEntries.map(([rank, color]) => (
                <th key={rank} className="border-b border-slate-700 px-1.5 py-2 text-center">
                  <span style={{ color }}>{rank}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <RankTableRow
                key={`${row.category.categoryName}-${row.subcategory.subcategoryName}-${row.scenario?.scenarioName ?? index}`}
                row={row}
                rankEntries={rankEntries}
                localScenarioId={
                  row.scenario ? localScenarioIds.get(row.scenario.scenarioName.toLowerCase()) : undefined
                }
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RankTableRow({
  row,
  rankEntries,
  localScenarioId,
}: {
  row: BenchmarkRow;
  rankEntries: [string, string][];
  localScenarioId: number | undefined;
}) {
  const scenario = row.scenario;
  const currentColor = scenario?.currentRank ? rankEntries.find(([rank]) => rank === scenario.currentRank)?.[1] : null;
  const progress = scenario ? rankProgressPercent(scenario) : null;

  return (
    <tr className="border-b border-white/[0.055] bg-[#1f1f20] text-slate-300 hover:bg-[#252527]">
      {row.showCategory ? (
        <td
          rowSpan={row.categorySpan}
          className="border-r border-white/[0.07] px-1 py-2 text-center align-middle"
          style={{ color: row.category.color }}
        >
          <div className="[writing-mode:vertical-rl] rotate-180 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.18em]">
            {row.category.categoryName}
          </div>
        </td>
      ) : null}
      {row.showSubcategory ? (
        <td
          rowSpan={row.subcategorySpan}
          className="border-r border-white/[0.07] px-1 py-2 text-center align-middle"
          style={{ color: row.subcategory.color }}
        >
          <div className="[writing-mode:vertical-rl] rotate-180 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.16em]">
            {row.subcategory.subcategoryName}
          </div>
        </td>
      ) : null}
      <td className="max-w-[360px] px-3 py-2">
        {scenario ? (
          <div className="flex min-w-0 items-center gap-2">
            <BookOpen size={14} className="shrink-0 text-slate-400" aria-hidden />
            <div className="min-w-0">
              {localScenarioId ? (
                <Link
                  to="/scenario/$scenarioId"
                  params={{ scenarioId: String(localScenarioId) }}
                  className="block truncate font-semibold text-slate-100 hover:text-cyan-300"
                >
                  {scenario.scenarioName}
                </Link>
              ) : (
                <span className="block truncate font-semibold text-slate-100">{scenario.scenarioName}</span>
              )}
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2 text-slate-500">
              <BarChart3 size={13} aria-hidden />
              <ExternalLink size={13} aria-hidden />
              <Play size={13} aria-hidden />
            </div>
          </div>
        ) : (
          <span className="text-slate-500">Unresolved scenario</span>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        {scenario ? (
          <div>
            <span className="font-bold" style={{ color: currentColor ?? "#c4b5fd" }}>
              {scenario.personalBest == null ? "-" : formatScore(scenario.personalBest)}
            </span>
            <span className="ml-2 text-slate-500">{progress == null ? "0%" : `${progress}%`}</span>
          </div>
        ) : (
          <span className="text-slate-500">-</span>
        )}
      </td>
      <td className="px-2 py-2 text-center font-semibold text-slate-500">
        {scenario?.currentRank ?? "UR"}
      </td>
      {rankEntries.map(([rank, color]) => (
        <td key={rank} className="px-1.5 py-1.5">
          {scenario ? (
            <RankCell rank={rank} color={color} scenario={scenario} />
          ) : (
            <div className="h-5 rounded-sm bg-slate-800" />
          )}
        </td>
      ))}
    </tr>
  );
}

function RankCell({
  rank,
  color,
  scenario,
}: {
  rank: string;
  color: string;
  scenario: BenchmarkScenarioProgress;
}) {
  const threshold = scenario.thresholds.find((candidate) => candidate.rank === rank);
  const achieved = threshold != null && scenario.personalBest != null && scenario.personalBest >= threshold.score;
  const current = scenario.currentRank === rank;

  return (
    <div
      className="relative h-5 min-w-[84px] overflow-hidden rounded-sm text-center text-[11px] font-extrabold leading-5"
      style={{
        background: threshold
          ? `linear-gradient(135deg, ${color}, ${shadeColor(color, achieved ? -12 : -28)})`
          : "#151516",
        boxShadow: current ? `0 0 0 1px ${color}, 0 0 12px ${hexToRgba(color, 0.35)}` : undefined,
        clipPath: "polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)",
        color: readableTextColor(color),
        opacity: achieved || current ? 1 : 0.48,
      }}
      title={threshold ? `${rank}: ${formatScore(threshold.score)}` : `${rank}: no threshold`}
    >
      {threshold ? formatScore(threshold.score) : "-"}
    </div>
  );
}

function DifficultyMeta({ difficulty }: { difficulty: BenchmarkDifficultyProgress }) {
  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-slate-800 pt-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="text-sm text-slate-300">
        <span className="font-semibold text-slate-100">{difficulty.difficultyName}</span>
        <span className="mx-2 text-slate-600">/</span>
        <span>ID {difficulty.kovaaksBenchmarkId}</span>
        <span className="mx-2 text-slate-600">/</span>
        <span>{difficulty.sharecode}</span>
      </div>
      <p className="text-xs text-slate-500">
        {difficulty.resolvedScenarioCount} resolved from Kovaak, {difficulty.scenarioCount} expected from metadata.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-950 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="text-base font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function buildRows(difficulty: BenchmarkDifficultyProgress): BenchmarkRow[] {
  const rows: BenchmarkRow[] = [];

  for (const category of difficulty.categories) {
    const categoryStart = rows.length;
    let categorySpan = 0;

    for (const subcategory of category.subcategories) {
      const scenarios = subcategory.scenarios.length > 0 ? subcategory.scenarios : [null];
      const subcategorySpan = scenarios.length;
      categorySpan += subcategorySpan;

      scenarios.forEach((scenario, index) => {
        rows.push({
          category,
          categorySpan: 0,
          showCategory: false,
          subcategory,
          subcategorySpan,
          showSubcategory: index === 0,
          scenario,
        });
      });
    }

    if (categorySpan > 0) {
      rows[categoryStart].showCategory = true;
      rows[categoryStart].categorySpan = categorySpan;
    }
  }

  return rows;
}

function rankProgressPercent(scenario: BenchmarkScenarioProgress): number | null {
  if (scenario.personalBest == null || scenario.thresholds.length === 0) {
    return null;
  }

  const thresholds = [...scenario.thresholds].sort((left, right) => left.score - right.score);
  const next = thresholds.find((threshold) => scenario.personalBest != null && scenario.personalBest < threshold.score);
  if (!next) {
    return 100;
  }

  const nextIndex = thresholds.indexOf(next);
  const previous = nextIndex > 0 ? thresholds[nextIndex - 1] : null;
  const floor = previous?.score ?? 0;
  const range = next.score - floor;
  if (range <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(((scenario.personalBest - floor) / range) * 100)));
}

function formatScore(score: number): string {
  const fractionDigits = Math.abs(score) >= 100 ? 0 : Number.isInteger(score) ? 0 : 2;
  return score.toLocaleString(undefined, {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: 0,
  });
}

function readableTextColor(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) {
    return "#f8fafc";
  }
  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luminance > 0.62 ? "#101014" : "#f8fafc";
}

function shadeColor(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) {
    return hex;
  }
  const shift = (value: number) => Math.max(0, Math.min(255, value + amount));
  return `rgb(${shift(rgb.r)}, ${shift(rgb.g)}, ${shift(rgb.b)})`;
}

function hexToRgba(hex: string, alpha: number): string {
  const rgb = parseHex(hex);
  if (!rgb) {
    return `rgba(255, 255, 255, ${alpha})`;
  }
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}
