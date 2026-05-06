import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
      <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-violet-400/25 bg-panel/50 text-sm text-muted">
        No runs imported for this scenario yet.
      </div>
    );
  }

  return (
    <div className="h-80 rounded-xl border border-white/[0.06] bg-panel/70 p-4 shadow-card">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ink">Score progression</h3>
          <p className="text-xs text-muted">Score per run with personal-best ceiling</p>
        </div>
        <div className="flex gap-3 text-[11px] text-muted">
          <Legend color="#22d3ee" label="Score" />
          <Legend color="#fbbf24" label="PB" />
        </div>
      </div>
      <div className="h-[calc(100%-3.25rem)]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="runScoreFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.42} />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="runScoreStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(167,139,250,0.12)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#a193c9" }} stroke="rgba(167,139,250,0.18)" />
            <YAxis
              tick={{ fontSize: 11, fill: "#a193c9" }}
              stroke="rgba(167,139,250,0.18)"
              domain={["dataMin", "dataMax"]}
            />
            <Tooltip
              cursor={{ stroke: "rgba(167,139,250,0.35)", strokeWidth: 1 }}
              contentStyle={{
                background: "rgba(11, 8, 32, 0.92)",
                border: "1px solid rgba(167,139,250,0.3)",
                borderRadius: 10,
                color: "#f1edff",
                boxShadow: "0 8px 28px rgba(8, 4, 32, 0.6)",
              }}
              labelStyle={{ color: "#f1edff", fontWeight: 600 }}
              itemStyle={{ color: "#f1edff" }}
            />
            <Area
              type="monotone"
              dataKey="score"
              fill="url(#runScoreFill)"
              stroke="url(#runScoreStroke)"
              strokeWidth={2.5}
            />
            <Line
              type="monotone"
              dataKey="pb"
              stroke="#fbbf24"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
