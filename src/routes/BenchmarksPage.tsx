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
      <section className="rounded border border-line bg-white p-4 shadow-subtle">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Benchmarks</h2>
            <p className="text-sm text-slate-500">Bundled JSON definitions calculate rank progress from local PBs.</p>
          </div>
          <select
            className="h-9 rounded border border-line bg-panel px-3 text-sm outline-none focus:border-accent"
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
        <section key={category} className="rounded border border-line bg-white shadow-subtle">
          <div className="border-b border-line p-4">
            <h3 className="text-sm font-semibold">{category}</h3>
          </div>
          <div className="divide-y divide-line">
            {scenarios.map((scenario) => (
              <div
                key={scenario.scenarioName}
                className="grid gap-2 p-4 text-sm sm:grid-cols-[1fr_120px_120px_140px]"
              >
                <span className="font-medium">{scenario.scenarioName}</span>
                <span>PB {scenario.personalBest == null ? "-" : scenario.personalBest.toFixed(2)}</span>
                <span>{scenario.currentRank ?? "Unranked"}</span>
                <span className="text-slate-500">
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
        <section className="rounded border border-warn bg-white p-4 text-sm text-warn shadow-subtle">
          Benchmark progress failed to load.
        </section>
      ) : null}
    </div>
  );
}
