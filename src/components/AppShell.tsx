import { Link } from "@tanstack/react-router";
import { Activity, BarChart3, FolderSync, Gauge, Target } from "lucide-react";
import type { PropsWithChildren, ReactNode } from "react";
import { api } from "../lib/api";
import { useImportStats } from "../lib/queries";

export function AppShell({ children }: PropsWithChildren) {
  const importStats = useImportStats();

  async function chooseAndImport() {
    const folder = await api.selectStatsFolder();
    if (folder) {
      importStats.mutate(folder);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-700 bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-cyan-400 text-slate-950">
              <Target size={20} aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold">Kovaak's Progression Tracker</h1>
              <p className="truncate text-xs text-slate-300">Local stats, benchmarks, and PB trends</p>
            </div>
          </div>
          <button
            className="inline-flex h-9 items-center gap-2 rounded border border-cyan-300 bg-cyan-400 px-3 text-sm font-medium text-slate-950 shadow-subtle transition hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-70"
            type="button"
            onClick={chooseAndImport}
            disabled={importStats.isPending}
            title="Import stats folder"
          >
            <FolderSync size={16} aria-hidden />
            <span className="hidden sm:inline">{importStats.isPending ? "Importing" : "Import"}</span>
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          <NavLink to="/" icon={<Gauge size={17} aria-hidden />} label="Dashboard" />
          <NavLink to="/benchmarks" icon={<BarChart3 size={17} aria-hidden />} label="Benchmarks" />
          <div className="hidden rounded border border-slate-700 bg-slate-900 p-3 text-xs leading-5 text-slate-300 shadow-subtle lg:block">
            <div className="mb-2 flex items-center gap-2 font-medium text-slate-100">
              <Activity size={15} aria-hidden />
              Local-first
            </div>
            The app keeps imported runs in SQLite and treats online lookups as optional enrichment.
          </div>
        </nav>
        <main>{children}</main>
      </div>
    </div>
  );
}

function NavLink({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex h-10 items-center gap-2 rounded border border-slate-700 bg-slate-900 px-3 text-sm font-medium text-slate-100 shadow-subtle transition hover:border-cyan-300 hover:bg-slate-800 [&.active]:border-cyan-300 [&.active]:bg-slate-800"
    >
      {icon}
      {label}
    </Link>
  );
}
