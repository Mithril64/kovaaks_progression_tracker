import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, FolderSync, Gauge, Loader2, Target } from "lucide-react";
import type { PropsWithChildren, ReactNode } from "react";
import { api } from "../lib/api";
import { useImportStats } from "../lib/queries";

export function AppShell({ children }: PropsWithChildren) {
  const importStats = useImportStats();
  useRouterState({ select: (state) => state.location.pathname });

  async function chooseAndImport() {
    const folder = await api.selectStatsFolder();
    if (folder) {
      importStats.mutate(folder);
    }
  }

  return (
    <div className="min-h-screen text-ink">
      <header className="sticky top-0 z-30 border-b border-violet-500/15 bg-base/70 backdrop-blur-xl">
        <div className="absolute inset-x-0 bottom-0 h-px bg-accent-stripe opacity-70" aria-hidden />
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-accent-400 via-violet-400 to-magenta-400 text-base shadow-glow">
              <Target size={20} aria-hidden />
              <span className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent mix-blend-overlay" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold tracking-tight">
                <span className="text-gradient">Kovaak's</span>
                <span className="text-ink"> Progression Tracker</span>
              </h1>
              <p className="truncate text-[11px] text-muted">
                Local stats, benchmarks, and PB trends
              </p>
            </div>
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <nav className="flex min-w-0 gap-1.5 overflow-x-auto rounded-full border border-white/[0.06] bg-panel/60 p-1 backdrop-blur">
              <NavLink to="/" icon={<Gauge size={15} aria-hidden />} label="Dashboard" />
              <NavLink to="/benchmarks" icon={<BarChart3 size={15} aria-hidden />} label="Benchmarks" />
            </nav>
            <button
              className="group relative inline-flex h-9 shrink-0 items-center gap-2 overflow-hidden rounded-full border border-white/10 bg-gradient-to-r from-accent-400 via-violet-400 to-magenta-400 px-4 text-sm font-semibold text-base shadow-glow transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
              type="button"
              onClick={chooseAndImport}
              disabled={importStats.isPending}
              title="Import stats folder"
            >
              {importStats.isPending ? (
                <Loader2 size={15} className="animate-spin" aria-hidden />
              ) : (
                <FolderSync size={15} aria-hidden />
              )}
              <span className="hidden sm:inline">{importStats.isPending ? "Importing" : "Import stats"}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-6">
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}

function NavLink({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-muted transition hover:text-ink [&.active]:bg-gradient-to-r [&.active]:from-accent-400/20 [&.active]:via-violet-400/20 [&.active]:to-magenta-400/20 [&.active]:text-ink [&.active]:shadow-[inset_0_0_0_1px_rgba(167,139,250,0.35)]"
    >
      {icon}
      {label}
    </Link>
  );
}
