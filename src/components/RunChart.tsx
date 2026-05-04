import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Run } from "../lib/types";

export function RunChart({ runs }: { runs: Run[] }) {
  const sortedRuns = [...runs].sort((a, b) => new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime());
  const data = sortedRuns.map((run, index) => ({
      label: new Date(run.playedAt).toLocaleDateString(),
      score: run.score,
      pb: Math.max(...sortedRuns.slice(0, index + 1).map((candidate) => candidate.score)),
    }));

  if (data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded border border-dashed border-slate-700 bg-slate-900 text-sm text-slate-300">
        No runs imported for this scenario yet.
      </div>
    );
  }

  return (
    <div className="h-72 rounded border border-slate-700 bg-slate-900 p-3 shadow-card">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 18, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#2b3847" strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#9aa8b6" }} stroke="#2b3847" />
          <YAxis tick={{ fontSize: 12, fill: "#9aa8b6" }} stroke="#2b3847" domain={["dataMin", "dataMax"]} />
          <Tooltip
            contentStyle={{
              background: "#101821",
              border: "1px solid #2b3847",
              borderRadius: 6,
              color: "#e7eef7",
            }}
            labelStyle={{ color: "#e7eef7" }}
          />
          <Line type="monotone" dataKey="score" stroke="#4cc7d9" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="pb" stroke="#f08a5d" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
