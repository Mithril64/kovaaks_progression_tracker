import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Run } from "../lib/types";

export function RunChart({ runs }: { runs: Run[] }) {
  const data = [...runs]
    .sort((a, b) => new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime())
    .map((run, index) => ({
      label: new Date(run.playedAt).toLocaleDateString(),
      score: run.score,
      pb: Math.max(...runs.slice(0, index + 1).map((candidate) => candidate.score)),
    }));

  if (data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded border border-dashed border-line bg-white text-sm text-slate-500">
        No runs imported for this scenario yet.
      </div>
    );
  }

  return (
    <div className="h-72 rounded border border-line bg-white p-3 shadow-subtle">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 18, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#d9e0e7" strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} domain={["dataMin", "dataMax"]} />
          <Tooltip />
          <Line type="monotone" dataKey="score" stroke="#236d7b" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="pb" stroke="#b35b2a" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
