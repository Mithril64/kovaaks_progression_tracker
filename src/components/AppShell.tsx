import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, FolderSync, Gauge, Target } from "lucide-react";
import type { PropsWithChildren, ReactNode } from "react";
import { api } from "../lib/api";
import { useImportStats } from "../lib/queries";

export function AppShell({ children }: PropsWithChildren) {
  const importStats = useImportStats();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  async function chooseAndImport() {
    const folder = await api.selectStatsFolder();
    if (folder) {
      importStats.mutate(folder);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-700 bg-slate-900">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-cyan-400 text-slate-950">
              <Target size={20} aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-slate-50">Kovaak's Progression Tracker</h1>
              <p className="truncate text-xs text-cyan-100">Local stats, benchmarks, and PB trends</p>
            </div>
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <nav className="flex min-w-0 gap-2 overflow-x-auto">
              <NavLink to="/" icon={<Gauge size={17} aria-hidden />} label="Dashboard" />
              <NavLink to="/benchmarks" icon={<BarChart3 size={17} aria-hidden />} label="Benchmarks" />
            </nav>
            <button
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded border border-cyan-300 bg-cyan-400 px-3 text-sm font-medium text-slate-950 shadow-card transition hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-70"
              type="button"
              onClick={chooseAndImport}
              disabled={importStats.isPending}
              title="Import stats folder"
            >
              <FolderSync size={16} aria-hidden />
              <span className="hidden sm:inline">{importStats.isPending ? "Importing" : "Import"}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1800px] px-4 py-4 sm:px-6">
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}

function NavLink({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex h-10 items-center gap-2 rounded border border-slate-700 bg-slate-900 px-3 text-sm font-medium text-slate-100 shadow-card transition hover:border-cyan-300 hover:bg-slate-800 [&.active]:border-cyan-300 [&.active]:bg-slate-800"
    >
      {icon}
      {label}
    </Link>
  );
}
