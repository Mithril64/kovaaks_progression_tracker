import { Link } from "@tanstack/react-router";
import {
  Activity,
  Award,
  BarChart3,
  Calendar,
  Crosshair,
  Flame,
  Layers,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
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
import type { ActivityPoint, DistributionBucket, ScenarioInsight, SkillSlice } from "../lib/types";

export function DashboardPage() {
  const dashboard = useDashboard();
  const analytics = useLocalAnalytics();
  const scenarios = useScenarios();
  const [query, setQuery] = useState("");

  const filteredScenarios = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (scenarios.data ?? []).filter((scenario) => scenario.name.toLowerCase().includes(normalized));
  }, [query, scenarios.data]);

  const derived = useMemo(() => deriveMetrics(analytics.data?.skillSlices ?? [], analytics.data?.activity ?? []), [
    analytics.data?.skillSlices,
    analytics.data?.activity,
  ]);

  if (dashboard.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-violet-400/20 bg-panel/60 text-sm text-muted shadow-card">
        Loading dashboard...
      </div>
    );
  }

  if (dashboard.isError) {
    return (
      <div className="rounded-xl border border-warn/40 bg-panel/60 p-6 text-warn shadow-card">
        Dashboard failed to load.
      </div>
    );
  }

  const data = dashboard.data;
  const lastImport = data?.lastImportAt ? new Date(data.lastImportAt) : null;

  return (
    <div className="space-y-5">
      <HeroBanner
        totalRuns={data?.totalRuns ?? 0}
        totalScenarios={data?.totalScenarios ?? 0}
        lastImport={lastImport}
        topSkill={derived.topSkill}
      />

      <div className="grid metric-grid gap-3">
        <MetricCard
          label="Total Runs"
          value={(data?.totalRuns ?? 0).toLocaleString()}
          detail="Imported attempts"
          icon={<Crosshair size={14} />}
          accent="cyan"
        />
        <MetricCard
          label="Scenarios"
          value={(data?.totalScenarios ?? 0).toLocaleString()}
          detail="With stored history"
          icon={<Layers size={14} />}
          accent="violet"
        />
        <MetricCard
          label="Active Days"
          value={derived.activeDays}
          detail={`${derived.runsPerActiveDay.toFixed(1)} runs/day avg`}
          icon={<Calendar size={14} />}
          accent="lime"
        />
        <MetricCard
          label="Current Streak"
          value={`${derived.currentStreak}d`}
          detail={`Longest ${derived.longestStreak}d`}
          icon={<Flame size={14} />}
          accent="gold"
        />
        <MetricCard
          label="Personal Bests"
          value={derived.totalPbs}
          detail="In recent activity"
          icon={<Trophy size={14} />}
          accent="magenta"
          trend={derived.totalPbs > 0 ? { value: `+${derived.totalPbs} PB` } : undefined}
        />
        <MetricCard
          label="Avg Performance"
          value={`${derived.avgPerformance.toFixed(0)}%`}
          detail={`${derived.avgConsistency.toFixed(0)}% stable`}
          icon={<Activity size={14} />}
          accent="cyan"
        />
        <MetricCard
          label="Top Skill"
          value={derived.topSkill?.name ?? "-"}
          detail={derived.topSkill ? `${derived.topSkill.performance.toFixed(0)}% performance` : "No data"}
          icon={<Sparkles size={14} />}
          accent="violet"
        />
        <MetricCard
          label="Best Day"
          value={derived.bestDay.runs.toString()}
          detail={derived.bestDay.label ?? "Awaiting activity"}
          icon={<Zap size={14} />}
          accent="gold"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
        <SkillRadarPanel skillSlices={analytics.data?.skillSlices ?? []} />
        <ActivityPanel activity={analytics.data?.activity ?? []} totals={derived} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DistributionPanel
          title="Score Distribution"
          subtitle="Runs as a percentage of each scenario PB."
          icon={<BarChart3 size={14} />}
          data={analytics.data?.scoreDistribution ?? []}
          gradient={["#22d3ee", "#a78bfa"]}
        />
        <DistributionPanel
          title="Accuracy Distribution"
          subtitle="Imported summary accuracy bands."
          icon={<Target size={14} />}
          data={analytics.data?.accuracyDistribution ?? []}
          gradient={["#f472b6", "#fbbf24"]}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <InsightList
          title="Most Improved"
          icon={<TrendingUp size={14} />}
          accent="lime"
          items={analytics.data?.mostImproved ?? []}
          metric={(item) => `+${item.improvementPercent.toFixed(0)}%`}
        />
        <InsightList
          title="Most Consistent"
          icon={<Award size={14} />}
          accent="cyan"
          items={analytics.data?.mostConsistent ?? []}
          metric={(item) => `${item.consistency.toFixed(0)}%`}
        />
        <InsightList
          title="Highest Volume"
          icon={<Activity size={14} />}
          accent="magenta"
          items={analytics.data?.highestVolume ?? []}
          metric={(item) => `${item.runCount} runs`}
        />
      </div>

      <section className="overflow-hidden rounded-xl border border-white/[0.06] bg-panel/70 shadow-card backdrop-blur">
        <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-ink">Scenarios</h2>
            <p className="text-xs text-muted">Search imported scenarios and open progression history.</p>
          </div>
          <label className="relative block sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input
              className="h-9 w-full rounded-full border border-white/[0.08] bg-base/60 pl-9 pr-3 text-sm text-ink outline-none placeholder:text-subtle focus:border-accent-400/60 focus:ring-2 focus:ring-accent-400/20"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search scenarios"
            />
          </label>
        </div>
        <div className="divide-y divide-white/[0.05]">
          {filteredScenarios.map((scenario) => (
            <Link
              key={scenario.id}
              to="/scenario/$scenarioId"
              params={{ scenarioId: String(scenario.id) }}
              className="group grid gap-2 px-4 py-3 text-ink transition hover:bg-violet-500/[0.06] sm:grid-cols-[1fr_140px_140px_120px]"
            >
              <span className="min-w-0 truncate font-semibold group-hover:text-gradient">{scenario.name}</span>
              <span className="text-sm text-muted">
                <span className="font-medium text-gold-400">PB</span> {scenario.personalBest.toFixed(2)}
              </span>
              <span className="text-sm text-muted">
                <span className="font-medium text-accent-200">{scenario.runCount}</span> runs
              </span>
              <span className="text-xs text-subtle">
                {scenario.lastPlayedAt ? new Date(scenario.lastPlayedAt).toLocaleDateString() : "-"}
              </span>
            </Link>
          ))}
          {filteredScenarios.length === 0 ? <div className="p-4 text-sm text-muted">No scenarios found.</div> : null}
        </div>
      </section>
    </div>
  );
}

function HeroBanner({
  totalRuns,
  totalScenarios,
  lastImport,
  topSkill,
}: {
  totalRuns: number;
  totalScenarios: number;
  lastImport: Date | null;
  topSkill: SkillSlice | null;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-violet-500/15 via-panel/70 to-magenta-500/10 p-5 shadow-card">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent-400/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-magenta-400/15 blur-3xl"
      />
      <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="space-y-2">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-accent-400/30 bg-accent-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-accent-200">
            <Sparkles size={11} /> Performance Overview
          </p>
          <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Track every <span className="text-gradient">click</span>, climb every rank.
          </h2>
          <p className="max-w-2xl text-sm text-muted">
            {totalRuns > 0
              ? `${totalRuns.toLocaleString()} runs across ${totalScenarios} scenarios — ${
                  topSkill ? `${topSkill.name} leads at ${topSkill.performance.toFixed(0)}% performance.` : "import stats to see your top skill."
                }`
              : "Import a Kovaak's stats folder to start tracking your progression."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <HeroChip
            label="Last Import"
            value={lastImport ? lastImport.toLocaleDateString() : "Never"}
            tone="cyan"
          />
          <HeroChip label="Runs" value={totalRuns.toLocaleString()} tone="violet" />
          <HeroChip label="Scenarios" value={totalScenarios.toLocaleString()} tone="magenta" />
        </div>
      </div>
    </section>
  );
}

function HeroChip({ label, value, tone }: { label: string; value: string; tone: "cyan" | "violet" | "magenta" }) {
  const palette: Record<typeof tone, string> = {
    cyan: "border-accent-400/30 bg-accent-400/10 text-accent-200",
    violet: "border-violet-400/30 bg-violet-400/10 text-violet-400",
    magenta: "border-magenta-400/30 bg-magenta-400/10 text-magenta-400",
  };
  return (
    <div className={`rounded-xl border px-3 py-2 backdrop-blur ${palette[tone]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-80">{label}</p>
      <p className="text-lg font-bold leading-none">{value}</p>
    </div>
  );
}

function SkillRadarPanel({ skillSlices }: { skillSlices: SkillSlice[] }) {
  return (
    <section className="overflow-hidden rounded-xl border border-white/[0.06] bg-panel/70 shadow-card backdrop-blur">
      <div className="flex items-start justify-between gap-3 border-b border-white/[0.05] p-4">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-ink">Local Skill Radar</h2>
          <p className="text-xs text-muted">PB-normalized performance from imported runs.</p>
        </div>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-accent-400/30 bg-accent-400/10 text-accent-200">
          <Sparkles size={14} />
        </span>
      </div>
      <div className="grid gap-3 p-4">
        <div className="h-72 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={skillSlices} outerRadius="70%" margin={{ top: 18, right: 34, bottom: 18, left: 34 }}>
              <defs>
                <radialGradient id="radarFill" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.25} />
                </radialGradient>
              </defs>
              <PolarGrid stroke="rgba(167,139,250,0.18)" />
              <PolarAngleAxis dataKey="name" tick={{ fill: "#a193c9", fontSize: 10 }} />
              <Radar
                dataKey="performance"
                stroke="#22d3ee"
                fill="url(#radarFill)"
                fillOpacity={0.85}
                strokeWidth={2.2}
              />
              <Tooltip content={<ChartTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {skillSlices.map((slice, index) => {
            const tones = [
              "from-accent-400 to-violet-400 text-accent-200",
              "from-magenta-400 to-violet-400 text-magenta-400",
              "from-lime-400 to-accent-400 text-lime-400",
              "from-gold-400 to-magenta-400 text-gold-400",
            ];
            const tone = tones[index % tones.length];
            return (
              <div key={slice.name} className="group rounded-lg border border-white/[0.05] bg-base/40 p-3">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-semibold text-ink">{slice.name}</span>
                  <span className={`text-sm font-bold ${tone.split(" ").pop()}`}>{slice.performance.toFixed(0)}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${tone.split(" ").slice(0, 2).join(" ")}`}
                    style={{ width: `${Math.max(2, Math.min(100, slice.performance))}%` }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-2 text-[11px] text-muted">
                  <span>{slice.scenarioCount} scenarios</span>
                  <span>·</span>
                  <span>{slice.runCount} runs</span>
                  <span>·</span>
                  <span>{slice.consistency.toFixed(0)}% stable</span>
                  {slice.avgAccuracy != null ? (
                    <>
                      <span>·</span>
                      <span>{(slice.avgAccuracy * 100).toFixed(0)}% acc</span>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ActivityPanel({
  activity,
  totals,
}: {
  activity: ActivityPoint[];
  totals: { totalRunsTracked: number; totalPbs: number; bestDay: { runs: number; label: string | null } };
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-white/[0.06] bg-panel/70 shadow-card backdrop-blur">
      <div className="flex items-start justify-between gap-3 border-b border-white/[0.05] p-4">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-ink">Training Activity</h2>
          <p className="text-xs text-muted">Daily volume and new personal bests.</p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[10px] uppercase tracking-[0.14em]">
          <span className="rounded-full border border-accent-400/30 bg-accent-400/10 px-2 py-0.5 font-semibold text-accent-200">
            {totals.totalRunsTracked} runs
          </span>
          <span className="rounded-full border border-gold-400/30 bg-gold-400/10 px-2 py-0.5 font-semibold text-gold-400">
            {totals.totalPbs} PBs
          </span>
        </div>
      </div>
      <div className="h-80 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={activity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="runsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="pbGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(167,139,250,0.12)" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fill: "#a193c9", fontSize: 11 }} stroke="rgba(167,139,250,0.18)" />
            <YAxis
              tick={{ fill: "#a193c9", fontSize: 11 }}
              stroke="rgba(167,139,250,0.18)"
              allowDecimals={false}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="runs" stroke="#22d3ee" fill="url(#runsGradient)" strokeWidth={2.2} />
            <Area
              type="monotone"
              dataKey="personalBests"
              stroke="#fbbf24"
              fill="url(#pbGradient)"
              strokeWidth={2.2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function DistributionPanel({
  title,
  subtitle,
  data,
  gradient,
  icon,
}: {
  title: string;
  subtitle: string;
  data: DistributionBucket[];
  gradient: [string, string];
  icon: React.ReactNode;
}) {
  const id = title.replace(/\s+/g, "-").toLowerCase();
  const total = data.reduce((sum, bucket) => sum + bucket.count, 0);

  return (
    <section className="overflow-hidden rounded-xl border border-white/[0.06] bg-panel/70 shadow-card backdrop-blur">
      <div className="flex items-start justify-between gap-3 border-b border-white/[0.05] p-4">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-ink">{title}</h2>
          <p className="text-xs text-muted">{subtitle}</p>
        </div>
        <span
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border"
          style={{
            color: gradient[0],
            borderColor: `${gradient[0]}55`,
            backgroundColor: `${gradient[0]}1a`,
          }}
        >
          {icon}
        </span>
      </div>
      <div className="flex items-center gap-2 border-b border-white/[0.04] px-4 py-2 text-[11px] text-muted">
        <span className="font-semibold text-ink">{total}</span>
        <span>runs distributed</span>
      </div>
      <div className="h-64 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`bar-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={gradient[0]} stopOpacity={0.95} />
                <stop offset="100%" stopColor={gradient[1]} stopOpacity={0.55} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(167,139,250,0.1)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#a193c9", fontSize: 11 }} stroke="rgba(167,139,250,0.18)" />
            <YAxis tick={{ fill: "#a193c9", fontSize: 11 }} stroke="rgba(167,139,250,0.18)" allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="count" fill={`url(#bar-${id})`} radius={[6, 6, 0, 0]} />
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
  icon,
  accent,
}: {
  title: string;
  items: ScenarioInsight[];
  metric: (item: ScenarioInsight) => string;
  icon: React.ReactNode;
  accent: "cyan" | "lime" | "magenta";
}) {
  const accents = {
    cyan: { dot: "bg-accent-400", text: "text-accent-200", border: "border-accent-400/30 bg-accent-400/10" },
    lime: { dot: "bg-lime-400", text: "text-lime-400", border: "border-lime-400/30 bg-lime-400/10" },
    magenta: { dot: "bg-magenta-400", text: "text-magenta-400", border: "border-magenta-400/30 bg-magenta-400/10" },
  } as const;
  const tone = accents[accent];

  return (
    <section className="overflow-hidden rounded-xl border border-white/[0.06] bg-panel/70 shadow-card backdrop-blur">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.05] p-4">
        <h2 className="text-sm font-bold tracking-tight text-ink">{title}</h2>
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border ${tone.border} ${tone.text}`}>
          {icon}
        </span>
      </div>
      <div className="divide-y divide-white/[0.05]">
        {items.map((item) => (
          <Link
            key={item.id}
            to="/scenario/$scenarioId"
            params={{ scenarioId: String(item.id) }}
            className="group grid gap-2 p-3 text-sm transition hover:bg-violet-500/[0.06]"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate font-semibold text-ink group-hover:text-gradient">{item.name}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${tone.border} ${tone.text}`}>
                {metric(item)}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
              <span className={`inline-flex items-center gap-1 ${tone.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                {item.skill}
              </span>
              <span>PB {item.personalBest.toFixed(2)}</span>
              <span>recent {item.recentAverage.toFixed(2)}</span>
              <span>{item.consistency.toFixed(0)}% stable</span>
            </div>
          </Link>
        ))}
        {items.length === 0 ? <div className="p-4 text-sm text-muted">No local runs imported.</div> : null}
      </div>
    </section>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-lg border border-violet-400/30 bg-base/95 px-3 py-2 text-xs shadow-card backdrop-blur">
      <div className="mb-1 font-semibold text-ink">{label}</div>
      {payload.map((item) => (
        <div key={item.name} className="flex items-center gap-2 text-muted">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="capitalize">{item.name}</span>
          <span className="font-semibold text-ink">
            {Number(item.value).toFixed(item.value % 1 === 0 ? 0 : 1)}
          </span>
        </div>
      ))}
    </div>
  );
}

function deriveMetrics(skillSlices: SkillSlice[], activity: ActivityPoint[]) {
  const totalRunsTracked = activity.reduce((sum, point) => sum + point.runs, 0);
  const totalPbs = activity.reduce((sum, point) => sum + point.personalBests, 0);
  const activeDays = activity.filter((point) => point.runs > 0).length;
  const runsPerActiveDay = activeDays > 0 ? totalRunsTracked / activeDays : 0;

  const bestDayPoint = activity.reduce<ActivityPoint | null>(
    (current, point) => (current && current.runs >= point.runs ? current : point),
    null,
  );
  const bestDay = {
    runs: bestDayPoint?.runs ?? 0,
    label: bestDayPoint?.date ?? null,
  };

  const sortedDays = [...activity]
    .filter((point) => point.runs > 0)
    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());

  let longestStreak = 0;
  let currentStreak = 0;
  let runningStreak = 0;
  let previousTime: number | null = null;
  for (const point of sortedDays) {
    const time = new Date(point.date).getTime();
    if (previousTime != null && time - previousTime <= 1000 * 60 * 60 * 26) {
      runningStreak += 1;
    } else {
      runningStreak = 1;
    }
    longestStreak = Math.max(longestStreak, runningStreak);
    currentStreak = runningStreak;
    previousTime = time;
  }

  const topSkill =
    skillSlices.length > 0
      ? skillSlices.reduce((best, slice) => (slice.performance > best.performance ? slice : best), skillSlices[0])
      : null;

  const avgPerformance = skillSlices.length
    ? skillSlices.reduce((sum, slice) => sum + slice.performance, 0) / skillSlices.length
    : 0;
  const avgConsistency = skillSlices.length
    ? skillSlices.reduce((sum, slice) => sum + slice.consistency, 0) / skillSlices.length
    : 0;

  return {
    totalRunsTracked,
    totalPbs,
    activeDays,
    runsPerActiveDay,
    longestStreak,
    currentStreak,
    bestDay,
    topSkill,
    avgPerformance,
    avgConsistency,
  };
}
