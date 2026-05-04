import { useMemo, useState } from "react";
import { useBenchmarkProgress, useBenchmarks } from "../lib/queries";

export function BenchmarksPage() {
  const benchmarks = useBenchmarks();
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const activeId = selectedId ?? benchmarks.data?.[0]?.id;
  const progress = useBenchmarkProgress(activeId);

  const categories = useMemo(() => {
    const grouped = new Map<string, NonNullable<typeof progress.data>["scenarios"]>();
    for (const scenario of progress.data?.scenarios ?? []) {
      const existing = grouped.get(scenario.category) ?? [];
      existing.push(scenario);
      grouped.set(scenario.category, existing);
    }
    return [...grouped.entries()];
  }, [progress.data]);

  return (
    <div className="space-y-4">
      <section className="rounded border border-slate-700 bg-slate-900 p-4 shadow-subtle">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Benchmarks</h2>
            <p className="text-sm text-slate-300">Bundled JSON definitions calculate rank progress from local PBs.</p>
          </div>
          <select
            className="h-9 rounded border border-slate-600 bg-slate-800 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300"
            value={activeId ?? ""}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            {(benchmarks.data ?? []).map((benchmark) => (
              <option key={benchmark.id} value={benchmark.id}>
                {benchmark.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {categories.map(([category, scenarios]) => (
        <section key={category} className="rounded border border-slate-700 bg-slate-900 shadow-subtle">
          <div className="border-b border-slate-700 p-4">
            <h3 className="text-sm font-semibold">{category}</h3>
          </div>
          <div className="divide-y divide-slate-700">
            {scenarios.map((scenario) => (
              <div
                key={scenario.scenarioName}
                className="grid gap-2 p-4 text-sm sm:grid-cols-[1fr_120px_120px_140px]"
              >
                <span className="font-medium">{scenario.scenarioName}</span>
                <span>PB {scenario.personalBest == null ? "-" : scenario.personalBest.toFixed(2)}</span>
                <span>{scenario.currentRank ?? "Unranked"}</span>
                <span className="text-slate-300">
                  {scenario.nextScoreNeeded == null
                    ? "Complete"
                    : `${scenario.nextScoreNeeded.toFixed(2)} to ${scenario.nextRank}`}
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}

      {progress.isError ? (
        <section className="rounded border border-orange-400 bg-slate-900 p-4 text-sm text-orange-300 shadow-subtle">
          Benchmark progress failed to load.
        </section>
      ) : null}
    </div>
  );
}
