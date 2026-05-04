import type { ReactNode } from "react";

export function MetricCard({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) {
  return (
    <section className="rounded border border-slate-700 bg-slate-900 p-4 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-300">{label}</p>
      <div className="mt-2 text-2xl font-semibold text-slate-100">{value}</div>
      {detail ? <p className="mt-1 text-xs text-slate-300">{detail}</p> : null}
    </section>
  );
}
