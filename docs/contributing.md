# Contributor Guide

This project is a Windows-first Kovaak's desktop tracker. The app imports local Kovaak's stat files, stores them in SQLite, renders local analytics in React, and optionally enriches benchmark views with Kovaak web API data.

The two halves of the app are:

- `src/`: React, TypeScript, TanStack Query/Router, Recharts, and Tailwind UI.
- `src-tauri/`: Tauri v2 shell, Rust commands, SQLite, file import, parsing, benchmark resolution, and Windows packaging configuration.

## Quick Start

On Windows:

```powershell
npm ci
npm run windows:dev
```

For frontend-only work:

```powershell
npm run dev
```

Before handing off changes, run:

```powershell
npm test
npm run build
npm run rust:test
```

For a local portable Windows artifact:

```powershell
npm run windows:portable-exe
npm run windows:portable
```

The portable zip is written to:

```text
artifacts/windows-portable/KovaaksProgressionTracker-windows-x64-portable.zip
```

## Runtime Flow

1. `src/main.tsx` creates the React router and query client.
2. `src/components/AppShell.tsx` provides the top navigation, import button, and shared page frame.
3. React calls `src/lib/api.ts`.
4. `api.ts` calls Tauri commands with `@tauri-apps/api/core` when running in the desktop app. In browser-only Vite mode, it returns mock data.
5. Tauri commands are registered in `src-tauri/src/lib.rs`.
6. Rust command handlers read/write SQLite through `src-tauri/src/db.rs`, parse stat files through `src-tauri/src/parser.rs`, and resolve benchmark data through `src-tauri/src/benchmarks.rs`.

## Frontend Map

`src/routes/DashboardPage.tsx`

The local overview. It renders imported run counts, scenario counts, activity, score distribution, accuracy distribution, and local insight lists from `get_dashboard` and `get_local_analytics`.

`src/routes/BenchmarksPage.tsx`

The benchmark library and rank table. It intentionally starts with metadata cards only. It does not call the Kovaak benchmark API until the user selects a benchmark card. After selection, it renders difficulty tabs and a rank-colored threshold table.

`src/routes/ScenarioPage.tsx`

Detailed local scenario history. It shows progression, spread, PB/recent average/accuracy/consistency, and run history. The history intentionally does not show the source CSV path.

`src/lib/types.ts`

The TypeScript mirror of Rust response shapes. When changing structs in `src-tauri/src/models.rs`, update this file in the same patch.

`src/lib/queries.ts`

TanStack Query wrappers. Use these hooks from route components instead of calling `api.ts` directly.

`src/lib/api.ts`

Tauri command boundary plus browser-mode mocks. If the app works in Tauri but breaks in `npm run dev`, check the mock shape here first.

`src/components/RunChart.tsx`

Shared scenario run chart component. It expects runs sorted enough to build a chronological progression line.

## Rust Map

`src-tauri/src/lib.rs`

Tauri entrypoint and command registration. This file owns:

- Stats folder detection.
- Folder picker command.
- Import command.
- Dashboard/scenario/benchmark command boundaries.
- SQLite app data path setup.

The app state stores one `Database` behind a `Mutex` and the bundled benchmark metadata loaded at startup.

`src-tauri/src/db.rs`

SQLite access layer. Keep SQL here rather than in command handlers. It owns:

- Schema migration bootstrap.
- Insert/deduplicate imported runs by `source_hash`.
- Backfilling accuracy from stored `raw_json`.
- Dashboard and scenario queries.
- Local analytics aggregation.
- Personal best lookup for benchmark matching.

`src-tauri/migrations/001_init.sql`

Current SQLite schema. This project does not yet have a multi-file migration runner; `db.rs` executes this schema and then applies small compatibility/backfill logic in Rust.

`src-tauri/src/parser.rs`

Kovaak stat parser. It accepts CSV, text-like key/value data, and some JSON-like inputs. The parser is deliberately forgiving because Kovaak/local tooling formats vary. See `docs/data-format.md`.

`src-tauri/src/benchmarks.rs`

Benchmark metadata loader and Kovaak API resolver. It loads bundled JSON files from `fixtures/benchmarks`, assigns stable slug IDs, and only resolves scenarios/thresholds when `get_benchmark_progress` is called.

Important benchmark details:

- Bundled metadata uses the Evxl-style JSON shape: `benchmarkName`, `rankCalculation`, `difficulties`, `categories`, `subcategories`, `rankColors`.
- Scenario names and thresholds are resolved from:

```text
https://kovaaks.com/webapp-backend/benchmarks/player-progress-rank-benchmark?benchmarkId=...&steamId=76561198000000000
```

- The dummy Steam ID is used to get zero-score benchmark structure. Local PBs still come from SQLite.
- Kovaak API `rank_maxes` are already on display score scale. Do not divide them by `100`.
- Kovaak API player score fields may use different scaling, but that is not currently used for local progress.
- API failures should degrade into `resolutionError` states. Do not block app startup on online providers.

`src-tauri/src/models.rs`

Rust response/request models. Most exported structs use `#[serde(rename_all = "camelCase")]` because React consumes camelCase JSON.

`src-tauri/src/providers.rs`

Placeholder provider boundary for online profile lookup. Keep online integrations optional; see `docs/provider-limitations.md`.

## Data Flow

Stats import:

1. User clicks Import in `AppShell`.
2. React calls `select_stats_folder`.
3. React calls `import_stats(folder)`.
4. `import_folder` walks files under that folder.
5. `parser.rs` parses each candidate file.
6. `db.rs` inserts new runs, dedupes old ones, and updates `last_import_at`.
7. TanStack Query invalidates all queries after import.

Benchmark progress:

1. `get_benchmarks` returns bundled metadata only.
2. `BenchmarksPage` renders benchmark cards.
3. User selects a card.
4. `useBenchmarkProgress(selectedId)` becomes enabled.
5. Rust fetches Kovaak benchmark progress per difficulty.
6. Rust maps resolved scenario names to local PBs by normalized scenario name.
7. React renders the rank-colored threshold table.

## Benchmark Fixtures

Bundled benchmark JSON lives in:

```text
fixtures/benchmarks/
```

Current included definitions:

- `voltaic_s5.json`
- `viscose_s2.json`
- `xyz_smoothness.json`

To add a benchmark:

1. Add a new JSON file using the existing Evxl-style shape.
2. Add it to `bundled_benchmarks()` in `src-tauri/src/benchmarks.rs`.
3. Add or update a Rust test if the library ordering/count matters.
4. Run `npm run rust:test`.

Avoid manually entering scenario names if a Kovaak benchmark ID exists. The app should resolve scenario names through the benchmark API so the metadata remains compact and matches Kovaak's current benchmark.

## Windows Paths

The app auto-detects common stats folders in `detect_stats_folders`, including:

```text
C:\Program Files (x86)\Steam\steamapps\common\FPSAimTrainer\FPSAimTrainer\stats
```

The user's imported data is stored in the app data SQLite database:

```text
tracker.sqlite3
```

The exact app data root is resolved by Tauri with `app.path().app_data_dir()`.

## Testing

Frontend:

```powershell
npm test
npm run build
```

Rust:

```powershell
npm run rust:test
```

Packaging smoke test:

```powershell
npm run windows:portable-exe
npm run windows:portable
```

If `windows:portable` fails with a file lock, an older portable exe is probably still running from `artifacts/windows-portable`. Close that app and rerun the package command.

## Design Notes

- The product target is Windows desktop. Browser-only mode is for frontend development and uses mocks.
- Local SQLite data is the source of truth. Online data is optional enrichment.
- Benchmark pages should not fetch online scenario data until a benchmark is selected.
- Wide benchmark tables should scroll inside their own table container, not widen the whole page.
- Keep UI text practical and app-like. This is an operational tracker, not a landing page.
- Prefer adding focused tests around parser, database, and benchmark scale assumptions; those are the easiest areas to regress quietly.

## Useful Docs

- `docs/data-format.md`: supported local stat import formats.
- `docs/provider-limitations.md`: rules for online provider/API integrations.
- `docs/windows-release.md`: GitHub Actions and local Windows packaging.
- `docs/windows-target.md`: Windows-first scope and Linux development boundaries.
