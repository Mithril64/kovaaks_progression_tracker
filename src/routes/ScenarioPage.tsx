import { getRouteApi } from "@tanstack/react-router";
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
    <div className="space-y-4">
      <section className="rounded border border-slate-700 bg-slate-900 p-4 shadow-card">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-300">Scenario Detail</p>
        <h2 className="mt-1 text-xl font-semibold">{scenarioName}</h2>
        <p className="mt-1 text-sm text-slate-300">
          {sortedRuns.length} runs - last played {stats.lastPlayed == null ? "-" : new Date(stats.lastPlayed).toLocaleString()}
        </p>
      </section>

      <div className="grid metric-grid gap-3">
        <MetricCard label="Personal Best" value={stats.best.toFixed(2)} detail={`${formatDelta(stats.improvement)} from first run`} />
        <MetricCard label="Recent Average" value={stats.recentAverage.toFixed(2)} detail="Last 5 runs" />
        <MetricCard label="Average Accuracy" value={stats.averageAccuracy == null ? "-" : `${(stats.averageAccuracy * 100).toFixed(1)}%`} detail="Derived from hits and misses" />
        <MetricCard label="Consistency" value={`${stats.consistency.toFixed(0)}%`} detail="Lower score spread is better" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <RunChart runs={runs.data ?? []} />
        <section className="rounded border border-slate-700 bg-slate-900 shadow-card">
          <div className="border-b border-slate-700 p-4">
            <h3 className="text-sm font-semibold">Score Spread</h3>
            <p className="text-xs text-slate-300">Runs bucketed as percentage of this scenario PB.</p>
          </div>
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.scoreBuckets} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} stroke="#334155" />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} stroke="#334155" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#020617", border: "1px solid #334155", borderRadius: 6, color: "#e2e8f0" }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Bar dataKey="count" fill="#22d3ee" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="rounded border border-slate-700 bg-slate-900 shadow-card">
        <div className="grid gap-3 border-b border-slate-700 p-4 sm:grid-cols-4">
          <SummaryStat label="Runs" value={String(sortedRuns.length)} />
          <SummaryStat label="Average" value={stats.average.toFixed(2)} />
          <SummaryStat label="Worst" value={stats.worst.toFixed(2)} />
          <SummaryStat label="PB Date" value={stats.bestRun == null ? "-" : new Date(stats.bestRun.playedAt).toLocaleDateString()} />
        </div>
        <div className="divide-y divide-slate-700">
          {[...sortedRuns].reverse().map((run) => (
            <div key={run.id} className="grid gap-2 p-4 text-sm sm:grid-cols-[170px_110px_110px_90px_1fr]">
              <span>{new Date(run.playedAt).toLocaleString()}</span>
              <span className="font-medium">{run.score.toFixed(2)}</span>
              <span>{run.accuracy == null ? "-" : `${(run.accuracy * 100).toFixed(1)}%`}</span>
              <span>{run.kills == null ? "-" : `${run.kills} kills`}</span>
              <span className="text-slate-300">{scoreLabel(run.score, stats.best)}</span>
            </div>
          ))}
          {sortedRuns.length === 0 ? <div className="p-4 text-sm text-slate-300">No runs imported for this scenario yet.</div> : null}
        </div>
      </section>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-300">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-100">{value}</p>
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

  return {
    best,
    worst,
    average,
    recentAverage,
    averageAccuracy: accuracies.length ? mean(accuracies) : null,
    consistency: consistency(scores) * 100,
    improvement: firstScore > 0 ? ((best - firstScore) / firstScore) * 100 : 0,
    lastPlayed: runs.at(-1)?.playedAt ?? null,
    bestRun,
    scoreBuckets: scoreBuckets(runs, best),
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
    const label = pct < 70 ? "<70%" : pct < 80 ? "70-80" : pct < 90 ? "80-90" : pct < 95 ? "90-95" : pct < 100 ? "95-99" : "PB";
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
