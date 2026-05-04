import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MetricCard } from "../components/MetricCard";
import { useDashboard, useLocalAnalytics, useScenarios } from "../lib/queries";
import type { DistributionBucket, ScenarioInsight } from "../lib/types";

export function DashboardPage() {
  const dashboard = useDashboard();
  const analytics = useLocalAnalytics();
  const scenarios = useScenarios();
  const [query, setQuery] = useState("");

  const filteredScenarios = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (scenarios.data ?? []).filter((scenario) => scenario.name.toLowerCase().includes(normalized));
  }, [query, scenarios.data]);

  if (dashboard.isLoading) {
    return <div className="rounded border border-slate-700 bg-slate-900 p-6 shadow-card">Loading dashboard...</div>;
  }

  if (dashboard.isError) {
    return <div className="rounded border border-orange-400 bg-slate-900 p-6 text-orange-300 shadow-card">Dashboard failed to load.</div>;
  }

  const data = dashboard.data;

  return (
    <div className="space-y-4">
      <div className="grid metric-grid gap-3">
        <MetricCard label="Runs" value={data?.totalRuns ?? 0} detail="Imported local attempts" />
        <MetricCard label="Scenarios" value={data?.totalScenarios ?? 0} detail="With stored history" />
        <MetricCard
          label="Last Import"
          value={data?.lastImportAt ? new Date(data.lastImportAt).toLocaleString() : "Never"}
          detail="SQLite source of truth"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
        <section className="rounded border border-slate-700 bg-slate-900 shadow-card">
          <div className="border-b border-slate-700 p-4">
            <h2 className="text-sm font-semibold">Local Skill Radar</h2>
            <p className="text-xs text-slate-300">PB-normalized performance from imported runs.</p>
          </div>
          <div className="grid gap-3 p-4">
            <div className="h-72 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={analytics.data?.skillSlices ?? []} outerRadius="70%" margin={{ top: 18, right: 34, bottom: 18, left: 34 }}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="name" tick={{ fill: "#cbd5e1", fontSize: 10 }} />
                  <Radar dataKey="performance" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.28} strokeWidth={2} />
                  <Tooltip content={<ChartTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {(analytics.data?.skillSlices ?? []).map((slice) => (
                <div key={slice.name} className="border-l-2 border-cyan-300 pl-3">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium">{slice.name}</span>
                    <span className="text-cyan-100">{slice.performance.toFixed(0)}%</span>
                  </div>
                  <div className="text-xs text-slate-300">
                    {slice.scenarioCount} scenarios · {slice.runCount} runs · {slice.consistency.toFixed(0)}% stable
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded border border-slate-700 bg-slate-900 shadow-card">
          <div className="border-b border-slate-700 p-4">
            <h2 className="text-sm font-semibold">Training Activity</h2>
            <p className="text-xs text-slate-300">Daily volume and new personal bests.</p>
          </div>
          <div className="h-80 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.data?.activity ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} stroke="#334155" />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} stroke="#334155" allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="runs" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.2} />
                <Area type="monotone" dataKey="personalBests" stroke="#facc15" fill="#facc15" fillOpacity={0.25} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DistributionPanel title="Score Distribution" subtitle="Runs as a percentage of each scenario PB." data={analytics.data?.scoreDistribution ?? []} color="#22c55e" />
        <DistributionPanel title="Accuracy Distribution" subtitle="Imported summary accuracy bands." data={analytics.data?.accuracyDistribution ?? []} color="#f472b6" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <InsightList title="Most Improved" items={analytics.data?.mostImproved ?? []} metric={(item) => `+${item.improvementPercent.toFixed(0)}%`} />
        <InsightList title="Most Consistent" items={analytics.data?.mostConsistent ?? []} metric={(item) => `${item.consistency.toFixed(0)}%`} />
        <InsightList title="Highest Volume" items={analytics.data?.highestVolume ?? []} metric={(item) => `${item.runCount} runs`} />
      </div>

      <section className="rounded border border-slate-700 bg-slate-900 shadow-card">
        <div className="flex flex-col gap-3 border-b border-slate-700 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Scenarios</h2>
            <p className="text-xs text-slate-300">Search imported scenarios and open progression history.</p>
          </div>
          <label className="relative block sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input
              className="h-9 w-full rounded border border-slate-600 bg-slate-800 pl-9 pr-3 text-sm text-slate-100 outline-none placeholder:text-slate-300 focus:border-cyan-300"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search scenarios"
            />
          </label>
        </div>
        <div className="divide-y divide-slate-700">
          {filteredScenarios.map((scenario) => (
            <Link
              key={scenario.id}
              to="/scenario/$scenarioId"
              params={{ scenarioId: String(scenario.id) }}
              className="grid gap-2 p-4 text-slate-100 transition hover:bg-slate-800 sm:grid-cols-[1fr_120px_140px]"
            >
              <span className="min-w-0 truncate font-medium">{scenario.name}</span>
              <span className="text-sm text-slate-300">PB {scenario.personalBest.toFixed(2)}</span>
              <span className="text-sm text-slate-300">{scenario.runCount} runs</span>
            </Link>
          ))}
          {filteredScenarios.length === 0 ? <div className="p-4 text-sm text-slate-300">No scenarios found.</div> : null}
        </div>
      </section>
    </div>
  );
}

function DistributionPanel({
  title,
  subtitle,
  data,
  color,
}: {
  title: string;
  subtitle: string;
  data: DistributionBucket[];
  color: string;
}) {
  return (
    <section className="rounded border border-slate-700 bg-slate-900 shadow-card">
      <div className="border-b border-slate-700 p-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-slate-300">{subtitle}</p>
      </div>
      <div className="h-64 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} stroke="#334155" />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} stroke="#334155" allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function InsightList({
  title,
  items,
  metric,
}: {
  title: string;
  items: ScenarioInsight[];
  metric: (item: ScenarioInsight) => string;
}) {
  return (
    <section className="rounded border border-slate-700 bg-slate-900 shadow-card">
      <div className="border-b border-slate-700 p-4">
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="divide-y divide-slate-700">
        {items.map((item) => (
          <Link
            key={item.id}
            to="/scenario/$scenarioId"
            params={{ scenarioId: String(item.id) }}
            className="grid gap-2 p-3 text-sm transition hover:bg-slate-800"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate font-medium">{item.name}</span>
              <span className="shrink-0 text-cyan-100">{metric(item)}</span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-300">
              <span>{item.skill}</span>
              <span>PB {item.personalBest.toFixed(2)}</span>
              <span>recent {item.recentAverage.toFixed(2)}</span>
            </div>
          </Link>
        ))}
        {items.length === 0 ? <div className="p-4 text-sm text-slate-300">No local runs imported.</div> : null}
      </div>
    </section>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color?: string }>; label?: string }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs shadow-card">
      <div className="mb-1 font-medium text-slate-100">{label}</div>
      {payload.map((item) => (
        <div key={item.name} className="flex items-center gap-2 text-slate-300">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
          <span>{item.name}</span>
          <span className="font-medium text-slate-100">{Number(item.value).toFixed(item.value % 1 === 0 ? 0 : 1)}</span>
        </div>
      ))}
    </div>
  );
}
