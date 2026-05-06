import type { ReactNode } from "react";

export type MetricAccent = "cyan" | "magenta" | "lime" | "gold" | "violet" | "neutral";

const accentStyles: Record<
  MetricAccent,
  { ring: string; chip: string; glow: string; bar: string; valueText: string }
> = {
  cyan: {
    ring: "from-accent-400/40 via-violet-400/10 to-transparent",
    chip: "bg-accent-400/15 text-accent-200 border-accent-400/30",
    glow: "shadow-glow",
    bar: "from-accent-400 via-cyan-300 to-violet-400",
    valueText: "text-accent-200",
  },
  magenta: {
    ring: "from-magenta-400/40 via-violet-400/10 to-transparent",
    chip: "bg-magenta-400/15 text-magenta-400 border-magenta-400/30",
    glow: "shadow-glow-pink",
    bar: "from-magenta-500 via-magenta-400 to-violet-400",
    valueText: "text-magenta-400",
  },
  lime: {
    ring: "from-lime-400/40 via-accent-400/10 to-transparent",
    chip: "bg-lime-400/15 text-lime-400 border-lime-400/30",
    glow: "shadow-glow-lime",
    bar: "from-lime-500 via-lime-400 to-accent-400",
    valueText: "text-lime-400",
  },
  gold: {
    ring: "from-gold-400/40 via-magenta-400/10 to-transparent",
    chip: "bg-gold-400/15 text-gold-400 border-gold-400/30",
    glow: "shadow-glow-gold",
    bar: "from-gold-500 via-gold-400 to-magenta-400",
    valueText: "text-gold-400",
  },
  violet: {
    ring: "from-violet-400/40 via-magenta-400/10 to-transparent",
    chip: "bg-violet-400/15 text-violet-400 border-violet-400/30",
    glow: "shadow-glow-violet",
    bar: "from-violet-500 via-violet-400 to-magenta-400",
    valueText: "text-violet-400",
  },
  neutral: {
    ring: "from-white/10 via-white/5 to-transparent",
    chip: "bg-white/5 text-muted border-white/10",
    glow: "shadow-card",
    bar: "from-violet-400 via-accent-400 to-magenta-400",
    valueText: "text-ink",
  },
};

export function MetricCard({
  label,
  value,
  detail,
  icon,
  accent = "cyan",
  trend,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
  icon?: ReactNode;
  accent?: MetricAccent;
  trend?: { value: string; positive?: boolean };
}) {
  const styles = accentStyles[accent];

  return (
    <section
      className={`group relative overflow-hidden rounded-xl border border-white/[0.06] bg-panel/70 p-4 backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-white/10 ${styles.glow}`}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br ${styles.ring} blur-2xl`}
      />
      <div
        aria-hidden
        className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${styles.bar} opacity-80`}
      />
      <div className="relative flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">{label}</p>
        {icon ? (
          <span className={`flex h-7 w-7 items-center justify-center rounded-lg border ${styles.chip}`}>
            {icon}
          </span>
        ) : null}
      </div>
      <div className={`relative mt-2 text-2xl font-bold tracking-tight ${styles.valueText}`}>{value}</div>
      <div className="relative mt-1 flex items-center justify-between gap-2">
        {detail ? <p className="text-xs text-muted">{detail}</p> : <span />}
        {trend ? (
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
              trend.positive === false
                ? "border-danger/30 bg-danger/10 text-danger"
                : "border-lime-400/30 bg-lime-400/10 text-lime-400"
            }`}
          >
            {trend.value}
          </span>
        ) : null}
      </div>
    </section>
  );
}
