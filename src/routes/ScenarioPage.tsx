import { getRouteApi, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Award,
  BarChart3,
  Calendar,
  Crosshair,
  Flame,
  Gauge,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MetricCard } from "../components/MetricCard";
import { RunChart } from "../components/RunChart";
import { useScenarioRuns } from "../lib/queries";
import type { Run } from "../lib/types";

const routeApi = getRouteApi("/scenario/$scenarioId");

export function ScenarioPage() {
  const params = routeApi.useParams();
  const scenarioId = Number(params.scenarioId);
  const runs = useScenarioRuns(scenarioId);
  const sortedRuns = [...(runs.data ?? [])].sort(
    (a, b) => new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime(),
  );
  const stats = scenarioStats(sortedRuns);
  const scenarioName = sortedRuns[0]?.scenarioName ?? "Scenario";

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-violet-500/15 via-panel/70 to-accent-500/10 p-5 shadow-card">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-magenta-400/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-12 h-64 w-64 rounded-full bg-accent-400/15 blur-3xl"
        />
        <div className="relative space-y-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted transition hover:text-accent-200"
          >
            <ArrowLeft size={13} /> Back to dashboard
          </Link>
          <p className="inline-flex items-center gap-1.5 rounded-full border border-magenta-400/30 bg-magenta-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-magenta-400">
            <Sparkles size={11} /> Scenario Detail
          </p>
          <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            <span className="text-gradient">{scenarioName}</span>
          </h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Crosshair size={13} className="text-accent-200" />
              {sortedRuns.length} runs
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={13} className="text-violet-400" />
              Last played {stats.lastPlayed == null ? "-" : new Date(stats.lastPlayed).toLocaleString()}
            </span>
            {stats.bestRun ? (
              <span className="inline-flex items-center gap-1.5">
                <Trophy size={13} className="text-gold-400" />
                PB on {new Date(stats.bestRun.playedAt).toLocaleDateString()}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid metric-grid gap-3">
        <MetricCard
          label="Personal Best"
          value={stats.best.toFixed(2)}
          detail="All-time peak"
          icon={<Trophy size={14} />}
          accent="gold"
          trend={
            sortedRuns.length > 1
              ? { value: formatDelta(stats.improvement), positive: stats.improvement >= 0 }
              : undefined
          }
        />
        <MetricCard
          label="Recent Average"
          value={stats.recentAverage.toFixed(2)}
          detail={`Last ${Math.min(5, sortedRuns.length)} runs`}
          icon={<TrendingUp size={14} />}
          accent="cyan"
          trend={
            stats.recentVsAllTime !== 0
              ? { value: formatDelta(stats.recentVsAllTime), positive: stats.recentVsAllTime >= 0 }
              : undefined
          }
        />
        <MetricCard
          label="Median"
          value={stats.median.toFixed(2)}
          detail={`Across ${sortedRuns.length} runs`}
          icon={<Gauge size={14} />}
          accent="violet"
        />
        <MetricCard
          label="Average Accuracy"
          value={stats.averageAccuracy == null ? "-" : `${(stats.averageAccuracy * 100).toFixed(1)}%`}
          detail={
            stats.peakAccuracy == null
              ? "No accuracy data"
              : `Peak ${(stats.peakAccuracy * 100).toFixed(1)}%`
          }
          icon={<Target size={14} />}
          accent="magenta"
        />
        <MetricCard
          label="Consistency"
          value={`${stats.consistency.toFixed(0)}%`}
          detail={`σ ${stats.stdDev.toFixed(2)}`}
          icon={<Award size={14} />}
          accent="lime"
        />
        <MetricCard
          label="Above 90% PB"
          value={stats.above90}
          detail={`${stats.above90Pct.toFixed(0)}% of runs`}
          icon={<Flame size={14} />}
          accent="gold"
        />
        <MetricCard
          label="Total Kills"
          value={stats.totalKills.toLocaleString()}
          detail={
            stats.runsWithKills > 0
              ? `${(stats.totalKills / stats.runsWithKills).toFixed(1)} avg/run`
              : "No kill data"
          }
          icon={<Crosshair size={14} />}
          accent="magenta"
        />
        <MetricCard
          label="Sessions"
          value={stats.sessions}
          detail={
            stats.sessions > 0
              ? `${(sortedRuns.length / stats.sessions).toFixed(1)} runs/session`
              : "No data"
          }
          icon={<Calendar size={14} />}
          accent="violet"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <RunChart runs={runs.data ?? []} />
        <section className="overflow-hidden rounded-xl border border-white/[0.06] bg-panel/70 shadow-card backdrop-blur">
          <div className="flex items-start justify-between gap-3 border-b border-white/[0.05] p-4">
            <div>
              <h3 className="text-sm font-bold tracking-tight text-ink">Score Spread</h3>
              <p className="text-xs text-muted">Runs bucketed as percentage of this scenario PB.</p>
            </div>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-magenta-400/30 bg-magenta-400/10 text-magenta-400">
              <BarChart3 size={14} />
            </span>
          </div>
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.scoreBuckets} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreSpread" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f472b6" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(167,139,250,0.12)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#a193c9", fontSize: 11 }} stroke="rgba(167,139,250,0.18)" />
                <YAxis
                  tick={{ fill: "#a193c9", fontSize: 11 }}
                  stroke="rgba(167,139,250,0.18)"
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(167,139,250,0.08)" }}
                  contentStyle={{
                    background: "rgba(11, 8, 32, 0.92)",
                    border: "1px solid rgba(167,139,250,0.3)",
                    borderRadius: 10,
                    color: "#f1edff",
                  }}
                  labelStyle={{ color: "#f1edff", fontWeight: 600 }}
                  itemStyle={{ color: "#f1edff" }}
                />
                <Bar dataKey="count" fill="url(#scoreSpread)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-white/[0.06] bg-panel/70 shadow-card backdrop-blur">
        <div className="grid gap-3 border-b border-white/[0.05] p-4 sm:grid-cols-4">
          <SummaryStat label="Runs" value={String(sortedRuns.length)} accent="text-accent-200" />
          <SummaryStat label="Average" value={stats.average.toFixed(2)} accent="text-violet-400" />
          <SummaryStat label="Worst" value={stats.worst.toFixed(2)} accent="text-magenta-400" />
          <SummaryStat
            label="PB Date"
            value={stats.bestRun == null ? "-" : new Date(stats.bestRun.playedAt).toLocaleDateString()}
            accent="text-gold-400"
          />
        </div>
        <div className="grid grid-cols-[170px_120px_120px_100px_1fr] gap-2 border-b border-white/[0.05] bg-base/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
          <span>Played</span>
          <span>Score</span>
          <span>Accuracy</span>
          <span>Kills</span>
          <span>vs PB</span>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {[...sortedRuns].reverse().map((run) => {
            const pct = stats.best > 0 ? (run.score / stats.best) * 100 : 0;
            const isPb = run.score >= stats.best && stats.best > 0;
            return (
              <div
                key={run.id}
                className={`grid gap-2 px-4 py-3 text-sm transition hover:bg-violet-500/[0.05] sm:grid-cols-[170px_120px_120px_100px_1fr] ${
                  isPb ? "bg-gold-400/[0.04]" : ""
                }`}
              >
                <span className="text-muted">{new Date(run.playedAt).toLocaleString()}</span>
                <span className="flex items-center gap-1.5 font-semibold text-ink">
                  {isPb ? <Trophy size={13} className="text-gold-400" /> : null}
                  {run.score.toFixed(2)}
                </span>
                <span className="text-muted">
                  {run.accuracy == null ? "-" : `${(run.accuracy * 100).toFixed(1)}%`}
                </span>
                <span className="text-muted">{run.kills == null ? "-" : `${run.kills} kills`}</span>
                <span className="flex items-center gap-2 text-muted">
                  <span className="h-1.5 w-24 overflow-hidden rounded-full bg-white/[0.06]">
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-accent-400 via-violet-400 to-magenta-400"
                      style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                    />
                  </span>
                  <span className={isPb ? "font-semibold text-gold-400" : ""}>
                    {scoreLabel(run.score, stats.best)}
                  </span>
                </span>
              </div>
            );
          })}
          {sortedRuns.length === 0 ? (
            <div className="p-4 text-sm text-muted">No runs imported for this scenario yet.</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function SummaryStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className={`mt-1 text-lg font-bold ${accent}`}>{value}</p>
    </div>
  );
}

function scenarioStats(runs: Run[]) {
  const scores = runs.map((run) => run.score);
  const best = scores.length ? Math.max(...scores) : 0;
  const worst = scores.length ? Math.min(...scores) : 0;
  const average = mean(scores);
  const recentAverage = mean(runs.slice(-5).map((run) => run.score));
  const accuracies = runs.map((run) => run.accuracy).filter((accuracy): accuracy is number => accuracy != null);
  const firstScore = runs[0]?.score ?? 0;
  const bestRun = runs.find((run) => run.score === best) ?? null;
  const stdDev = scores.length > 1 ? Math.sqrt(scores.reduce((sum, s) => sum + (s - average) ** 2, 0) / scores.length) : 0;
  const above90Count = best > 0 ? scores.filter((score) => score / best >= 0.9).length : 0;
  const above90Pct = scores.length > 0 ? (above90Count / scores.length) * 100 : 0;
  const recentVsAllTime = average > 0 ? ((recentAverage - average) / average) * 100 : 0;

  const kills = runs.map((run) => run.kills).filter((k): k is number => k != null);
  const totalKills = kills.reduce((sum, value) => sum + value, 0);

  return {
    best,
    worst,
    average,
    median: median(scores),
    recentAverage,
    recentVsAllTime,
    averageAccuracy: accuracies.length ? mean(accuracies) : null,
    peakAccuracy: accuracies.length ? Math.max(...accuracies) : null,
    consistency: consistency(scores) * 100,
    stdDev,
    improvement: firstScore > 0 ? ((best - firstScore) / firstScore) * 100 : 0,
    lastPlayed: runs.at(-1)?.playedAt ?? null,
    bestRun,
    scoreBuckets: scoreBuckets(runs, best),
    above90: above90Count,
    above90Pct,
    totalKills,
    runsWithKills: kills.length,
    sessions: countSessions(runs),
  };
}

function scoreBuckets(runs: Run[], best: number) {
  const counts = new Map([
    ["<70%", 0],
    ["70-80", 0],
    ["80-90", 0],
    ["90-95", 0],
    ["95-99", 0],
    ["PB", 0],
  ]);

  for (const run of runs) {
    const pct = best > 0 ? (run.score / best) * 100 : 0;
    const label =
      pct < 70 ? "<70%" : pct < 80 ? "70-80" : pct < 90 ? "80-90" : pct < 95 ? "90-95" : pct < 100 ? "95-99" : "PB";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return [...counts.entries()].map(([label, count]) => ({ label, count }));
}

function scoreLabel(score: number, best: number) {
  if (best <= 0) {
    return "-";
  }
  const pct = (score / best) * 100;
  return pct >= 100 ? "Personal best" : `${pct.toFixed(1)}% of PB`;
}

function formatDelta(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function mean(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function median(values: number[]) {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function consistency(values: number[]) {
  if (values.length < 2) {
    return 1;
  }
  const average = mean(values);
  if (average <= Number.EPSILON) {
    return 0;
  }
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
  return Math.max(0, Math.min(1, 1 - Math.sqrt(variance) / average));
}

function countSessions(runs: Run[]) {
  if (runs.length === 0) {
    return 0;
  }
  const days = new Set<string>();
  for (const run of runs) {
    days.add(new Date(run.playedAt).toDateString());
  }
  return days.size;
}
