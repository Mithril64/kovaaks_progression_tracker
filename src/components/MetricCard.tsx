import type { ReactNode } from "react";

export function MetricCard({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) {
  return (
    <section className="rounded border border-line bg-white p-4 shadow-subtle">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-2 text-2xl font-semibold text-ink">{value}</div>
      {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
    </section>
  );
}
