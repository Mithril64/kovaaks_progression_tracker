import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { MetricCard } from "../components/MetricCard";
import { useDashboard, useScenarios } from "../lib/queries";

export function DashboardPage() {
  const dashboard = useDashboard();
  const scenarios = useScenarios();
  const [query, setQuery] = useState("");

  const filteredScenarios = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (scenarios.data ?? []).filter((scenario) => scenario.name.toLowerCase().includes(normalized));
  }, [query, scenarios.data]);

  if (dashboard.isLoading) {
    return <div className="rounded border border-line bg-white p-6 shadow-subtle">Loading dashboard...</div>;
  }

  if (dashboard.isError) {
    return <div className="rounded border border-warn bg-white p-6 text-warn shadow-subtle">Dashboard failed to load.</div>;
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

      <section className="rounded border border-line bg-white shadow-subtle">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Scenarios</h2>
            <p className="text-xs text-slate-500">Search imported scenarios and open progression history.</p>
          </div>
          <label className="relative block sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              className="h-9 w-full rounded border border-line bg-panel pl-9 pr-3 text-sm outline-none focus:border-accent"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search scenarios"
            />
          </label>
        </div>
        <div className="divide-y divide-line">
          {filteredScenarios.map((scenario) => (
            <Link
              key={scenario.id}
              to="/scenario/$scenarioId"
              params={{ scenarioId: String(scenario.id) }}
              className="grid gap-2 p-4 transition hover:bg-lift sm:grid-cols-[1fr_120px_140px]"
            >
              <span className="min-w-0 truncate font-medium">{scenario.name}</span>
              <span className="text-sm text-slate-600">PB {scenario.personalBest.toFixed(2)}</span>
              <span className="text-sm text-slate-500">{scenario.runCount} runs</span>
            </Link>
          ))}
          {filteredScenarios.length === 0 ? <div className="p-4 text-sm text-slate-500">No scenarios found.</div> : null}
        </div>
      </section>
    </div>
  );
}
