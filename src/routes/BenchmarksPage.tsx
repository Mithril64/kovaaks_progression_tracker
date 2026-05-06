import { Link } from "@tanstack/react-router";
import { BarChart3, BookOpen, ExternalLink, Layers, Play, Sparkles, Target, Trophy } from "lucide-react";
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

  const playedPct = totals.total > 0 ? (totals.played / totals.total) * 100 : 0;
  const rankedPct = totals.total > 0 ? (totals.ranked / totals.total) * 100 : 0;

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-violet-500/15 via-panel/70 to-magenta-500/10 p-5 shadow-card">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-violet-400/15 blur-3xl"
        />
        <div className="relative flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-400">
              <Sparkles size={11} /> Benchmark Library
            </p>
            <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              {selectedBenchmark ? (
                <span className="text-gradient">{selectedBenchmark.benchmarkName}</span>
              ) : (
                <>Pick a <span className="text-gradient">benchmark</span> to compare</>
              )}
            </h2>
            <p className="max-w-2xl text-sm text-muted">
              Browse bundled benchmark metadata first; Kovaak scenario resolution starts only after selection.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <HeroStat
              label="Benchmarks"
              value={String(benchmarks.data?.length ?? 0)}
              icon={<Layers size={14} />}
              tone="violet"
            />
            <HeroStat
              label="Selected"
              value={selectedBenchmark?.abbreviation ?? "-"}
              icon={<Target size={14} />}
              tone="cyan"
            />
            <HeroStat
              label="Lookup"
              value={selectedId ? (progress.isFetching ? "Resolving" : "Ready") : "Idle"}
              icon={<Sparkles size={14} />}
              tone="magenta"
            />
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
        <section className="overflow-hidden rounded-xl border border-white/[0.06] bg-panel/70 shadow-card backdrop-blur">
          <div className="flex flex-col gap-4 border-b border-white/[0.05] p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {progress.data.difficulties.map((difficulty) => (
                <button
                  key={difficulty.difficultyName}
                  type="button"
                  className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] transition ${
                    activeDifficulty?.difficultyName === difficulty.difficultyName
                      ? "bg-gradient-to-r from-accent-400 via-violet-400 to-magenta-400 text-base shadow-glow"
                      : "border border-white/[0.08] bg-base/40 text-muted hover:border-violet-400/40 hover:text-ink"
                  }`}
                  onClick={() => setSelectedDifficulty(difficulty.difficultyName)}
                >
                  {difficulty.difficultyName}
                </button>
              ))}
            </div>
            {activeDifficulty ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <ProgressStat
                  label="Resolved"
                  numerator={activeDifficulty.resolvedScenarioCount}
                  denominator={activeDifficulty.scenarioCount}
                  tone="cyan"
                />
                <ProgressStat
                  label="Played"
                  numerator={totals.played}
                  denominator={totals.total}
                  tone="lime"
                  pct={playedPct}
                />
                <ProgressStat
                  label="Ranked"
                  numerator={totals.ranked}
                  denominator={totals.total}
                  tone="gold"
                  pct={rankedPct}
                />
              </div>
            ) : null}
          </div>
          {activeDifficulty ? <DifficultyMeta difficulty={activeDifficulty} /> : null}
        </section>
      ) : null}

      {activeDifficulty?.resolutionError ? (
        <section className="rounded-xl border border-warn/40 bg-panel/70 p-4 text-sm text-warn shadow-card">
          Could not resolve scenarios from Kovaak right now: {activeDifficulty.resolutionError}
        </section>
      ) : null}

      {activeDifficulty ? (
        <BenchmarkRankTable difficulty={activeDifficulty} localScenarioIds={localScenarioIds} />
      ) : null}

      {progress.isError ? (
        <section className="rounded-xl border border-warn/40 bg-panel/70 p-4 text-sm text-warn shadow-card">
          Benchmark progress failed to load.
        </section>
      ) : null}

      {!selectedId ? (
        <section className="rounded-xl border border-violet-400/20 bg-panel/60 p-4 text-sm text-muted shadow-card">
          Select a benchmark above to resolve its Kovaak scenarios and compare the thresholds against your local PBs.
        </section>
      ) : null}
    </div>
  );
}

function HeroStat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "cyan" | "violet" | "magenta";
}) {
  const palette = {
    cyan: "border-accent-400/30 bg-accent-400/10 text-accent-200",
    violet: "border-violet-400/30 bg-violet-400/10 text-violet-400",
    magenta: "border-magenta-400/30 bg-magenta-400/10 text-magenta-400",
  } as const;
  return (
    <div className={`rounded-xl border p-3 backdrop-blur ${palette[tone]}`}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-80">{label}</p>
        {icon}
      </div>
      <p className="mt-1 text-lg font-bold leading-tight">{value}</p>
    </div>
  );
}

function ProgressStat({
  label,
  numerator,
  denominator,
  tone,
  pct,
}: {
  label: string;
  numerator: number;
  denominator: number;
  tone: "cyan" | "lime" | "gold";
  pct?: number;
}) {
  const palette = {
    cyan: { text: "text-accent-200", bar: "from-accent-400 to-violet-400" },
    lime: { text: "text-lime-400", bar: "from-lime-400 to-accent-400" },
    gold: { text: "text-gold-400", bar: "from-gold-400 to-magenta-400" },
  } as const;
  const t = palette[tone];
  const value = pct ?? (denominator > 0 ? (numerator / denominator) * 100 : 0);
  return (
    <div className="rounded-xl border border-white/[0.06] bg-base/40 p-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
        <p className={`text-xs font-bold ${t.text}`}>{Math.round(value)}%</p>
      </div>
      <p className="mt-1 text-base font-bold text-ink">
        {numerator}
        <span className="text-sm font-medium text-muted">/{denominator}</span>
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div className={`h-full rounded-full bg-gradient-to-r ${t.bar}`} style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
      </div>
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
      className={`group relative overflow-hidden rounded-xl border p-4 text-left transition ${
        selected
          ? "border-transparent bg-panel/80 shadow-glow"
          : "border-white/[0.06] bg-panel/60 hover:-translate-y-0.5 hover:border-violet-400/30 hover:shadow-card"
      }`}
      onClick={onSelect}
    >
      {selected ? (
        <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] bg-accent-stripe" />
      ) : null}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-50 blur-2xl transition group-hover:opacity-80"
        style={{ backgroundColor: benchmark.color ?? "#a78bfa", opacity: selected ? 0.45 : 0.18 }}
      />
      <div className="relative mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
            {benchmark.abbreviation ?? benchmark.rankCalculation}
          </p>
          <h3 className="truncate text-base font-bold text-ink">{benchmark.benchmarkName}</h3>
        </div>
        <span
          className="h-5 w-5 shrink-0 rounded-md ring-1 ring-white/20"
          style={{ backgroundColor: benchmark.color ?? "#a78bfa" }}
        />
      </div>
      <div className="relative grid grid-cols-3 gap-2 text-sm">
        <CardMetric label="Difficulties" value={benchmark.difficulties.length} icon={<Layers size={12} />} />
        <CardMetric label="Scenarios" value={scenarioCount} icon={<Target size={12} />} />
        <CardMetric label="Added" value={benchmark.dateAdded?.slice(0, 4) ?? "-"} icon={<Sparkles size={12} />} />
      </div>
      <p className="relative mt-3 line-clamp-2 text-xs text-subtle">{difficultyNames}</p>
    </button>
  );
}

function CardMetric({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-base/50 px-2 py-1.5">
      <p className="flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-muted">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 font-bold text-ink">{value}</p>
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
      <section className="rounded-xl border border-violet-400/20 bg-panel/60 p-4 text-sm text-muted shadow-card">
        Scenario names will appear after Kovaak API resolution succeeds.
      </section>
    );
  }

  return (
    <section className="w-full max-w-full overflow-hidden rounded-xl border border-white/[0.06] bg-panel/70 shadow-card backdrop-blur">
      <div className="flex flex-col gap-3 border-b border-white/[0.05] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-magenta-400/30 bg-magenta-400/10 text-magenta-400">
            <Trophy size={14} />
          </span>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-ink">
              {difficulty.difficultyName} Rank Table
            </h3>
            <p className="text-xs text-muted">Scores are your local PBs; rank bands are Kovaak benchmark thresholds.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {rankEntries.map(([rank, color]) => (
            <span
              key={rank}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-base/50 px-2 py-1 text-[11px] font-bold text-ink"
            >
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
              <span style={{ color }}>{rank}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="max-w-full overflow-x-auto overflow-y-hidden">
        <table className="w-max min-w-full border-collapse text-left text-xs">
          <thead className="bg-base/60 text-[11px] uppercase tracking-[0.14em] text-muted">
            <tr>
              <th className="w-7 border-b border-white/[0.05] px-2 py-2" />
              <th className="w-8 border-b border-white/[0.05] px-2 py-2" />
              <th className="border-b border-white/[0.05] px-3 py-2">Scenario</th>
              <th className="w-28 border-b border-white/[0.05] px-3 py-2 text-right">Score</th>
              <th className="w-16 border-b border-white/[0.05] px-2 py-2 text-center">
                <BarChart3 size={14} aria-label="Rank progress" />
              </th>
              {rankEntries.map(([rank, color]) => (
                <th key={rank} className="border-b border-white/[0.05] px-1.5 py-2 text-center">
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
    <tr className="border-b border-white/[0.04] bg-panel/40 text-muted hover:bg-violet-500/[0.06]">
      {row.showCategory ? (
        <td
          rowSpan={row.categorySpan}
          className="border-r border-white/[0.05] px-1 py-2 text-center align-middle"
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
          className="border-r border-white/[0.05] px-1 py-2 text-center align-middle"
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
            <BookOpen size={14} className="shrink-0 text-subtle" aria-hidden />
            <div className="min-w-0">
              {localScenarioId ? (
                <Link
                  to="/scenario/$scenarioId"
                  params={{ scenarioId: String(localScenarioId) }}
                  className="block truncate font-bold text-ink hover:text-accent-200"
                >
                  {scenario.scenarioName}
                </Link>
              ) : (
                <span className="block truncate font-bold text-ink">{scenario.scenarioName}</span>
              )}
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2 text-subtle">
              <BarChart3 size={13} aria-hidden />
              <ExternalLink size={13} aria-hidden />
              <Play size={13} aria-hidden />
            </div>
          </div>
        ) : (
          <span className="text-subtle">Unresolved scenario</span>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        {scenario ? (
          <div className="flex flex-col items-end">
            <span className="font-bold" style={{ color: currentColor ?? "#c4b5fd" }}>
              {scenario.personalBest == null ? "-" : formatScore(scenario.personalBest)}
            </span>
            <span className="text-[10px] text-subtle">{progress == null ? "0%" : `${progress}%`}</span>
          </div>
        ) : (
          <span className="text-subtle">-</span>
        )}
      </td>
      <td className="px-2 py-2 text-center font-bold text-subtle">{scenario?.currentRank ?? "UR"}</td>
      {rankEntries.map(([rank, color]) => (
        <td key={rank} className="px-1.5 py-1.5">
          {scenario ? (
            <RankCell rank={rank} color={color} scenario={scenario} />
          ) : (
            <div className="h-5 rounded-sm bg-white/[0.04]" />
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
          ? `linear-gradient(135deg, ${color}, ${shadeColor(color, achieved ? -12 : -32)})`
          : "rgba(255, 255, 255, 0.03)",
        boxShadow: current ? `0 0 0 1px ${color}, 0 0 14px ${hexToRgba(color, 0.45)}` : undefined,
        clipPath: "polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)",
        color: readableTextColor(color),
        opacity: achieved || current ? 1 : 0.42,
      }}
      title={threshold ? `${rank}: ${formatScore(threshold.score)}` : `${rank}: no threshold`}
    >
      {threshold ? formatScore(threshold.score) : "-"}
    </div>
  );
}

function DifficultyMeta({ difficulty }: { difficulty: BenchmarkDifficultyProgress }) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3 text-xs lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-muted">
        <span className="font-bold text-ink">{difficulty.difficultyName}</span>
        <span className="text-subtle">·</span>
        <span>ID {difficulty.kovaaksBenchmarkId}</span>
        <span className="text-subtle">·</span>
        <span className="font-mono text-accent-200">{difficulty.sharecode}</span>
      </div>
      <p className="text-[11px] text-subtle">
        {difficulty.resolvedScenarioCount} resolved from Kovaak, {difficulty.scenarioCount} expected from metadata.
      </p>
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
