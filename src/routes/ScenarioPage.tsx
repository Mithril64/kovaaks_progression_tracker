import { getRouteApi } from "@tanstack/react-router";
import { RunChart } from "../components/RunChart";
import { useScenarioRuns } from "../lib/queries";

const routeApi = getRouteApi("/scenario/$scenarioId");

export function ScenarioPage() {
  const params = routeApi.useParams();
  const scenarioId = Number(params.scenarioId);
  const runs = useScenarioRuns(scenarioId);
  const scenarioName = runs.data?.[0]?.scenarioName ?? "Scenario";
  const best = runs.data?.reduce((max, run) => Math.max(max, run.score), 0) ?? 0;

  return (
    <div className="space-y-4">
      <section className="rounded border border-slate-700 bg-slate-900 p-4 shadow-subtle">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-300">Progression</p>
        <h2 className="mt-1 text-xl font-semibold">{scenarioName}</h2>
        <p className="mt-1 text-sm text-slate-300">
          {runs.data?.length ?? 0} runs · PB {best.toFixed(2)}
        </p>
      </section>
      <RunChart runs={runs.data ?? []} />
      <section className="rounded border border-slate-700 bg-slate-900 shadow-subtle">
        <div className="border-b border-slate-700 p-4 text-sm font-semibold">Run History</div>
        <div className="divide-y divide-slate-700">
          {(runs.data ?? []).map((run) => (
            <div key={run.id} className="grid gap-2 p-4 text-sm sm:grid-cols-[160px_100px_100px_1fr]">
              <span>{new Date(run.playedAt).toLocaleString()}</span>
              <span className="font-medium">{run.score.toFixed(2)}</span>
              <span>{run.accuracy == null ? "-" : `${(run.accuracy * 100).toFixed(1)}%`}</span>
              <span className="truncate text-slate-300">{run.sourceFile}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
