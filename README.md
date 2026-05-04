# Kovaak's Progression Tracker

Local-first Windows desktop tracker for Kovaak's stats history, built with Tauri v2, React, TypeScript, and SQLite.

Windows is the supported product target. Linux is useful for frontend development and core Rust testing, but Linux desktop packages are not part of the release goal. Windows release builds should be produced on native Windows or through GitHub Actions.

## Development

New contributors should start with [docs/contributing.md](docs/contributing.md). It explains the frontend routes, Tauri commands, SQLite/import flow, benchmark metadata, Kovaak API resolution, and the expected verification commands.

Fresh Arch setup:

```bash
sudo pacman -Syu --needed make
make bootstrap
```

Fresh Ubuntu/WSL setup:

```bash
sudo apt-get update
sudo apt-get install -y make
make bootstrap
```

The bootstrap target installs base Arch or Ubuntu build tools, Node.js, Rust stable, npm dependencies, Playwright Chromium, and runs the verification suite.

```bash
npm install
npm run windows:dev
```

For frontend-only work on Linux or Windows:

```bash
npm run dev
```

## Verification

```bash
npm run build
npm test
npm run rust:test
```

The browser-only Vite app uses mock data. The Windows Tauri app persists imported stats to SQLite in the app data directory.

## Codebase Map

- `src/routes/`: top-level React pages for dashboard, benchmark library/rank table, and scenario detail.
- `src/lib/api.ts`: Tauri command boundary plus browser-mode mocks.
- `src/lib/queries.ts`: TanStack Query hooks used by React pages.
- `src-tauri/src/lib.rs`: Tauri command registration and app state setup.
- `src-tauri/src/db.rs`: SQLite schema bootstrap, inserts, dedupe, dashboard queries, and local analytics.
- `src-tauri/src/parser.rs`: forgiving Kovaak local stat parser.
- `src-tauri/src/benchmarks.rs`: bundled benchmark metadata and Kovaak benchmark API resolution.
- `fixtures/benchmarks/`: Evxl-style benchmark JSON definitions bundled with the app.

See [docs/contributing.md](docs/contributing.md) for the detailed walkthrough.

## Windows Portable Build

The preferred packaging path is GitHub Actions. Run the `Windows Portable` workflow to produce:

```text
KovaaksProgressionTracker-windows-x64-portable.zip
```

The zip contains the Windows executable, a quick-start README, and a WebView2 bootstrapper under `dependencies/`.

For a local native Windows build:

```powershell
npm ci
npm run windows:portable-exe
npm run windows:portable
```

See [docs/windows-release.md](docs/windows-release.md).

From Arch, you can trigger and download the Windows release without leaving the terminal:

```bash
gh auth login
make github-release TAG=v0.1.0
make github-release-watch
make github-release-download TAG=v0.1.0
```

## Windows Paths

The app auto-detects these Windows stats folders when they exist:

- `C:\Program Files (x86)\Steam\steamapps\common\FPSAimTrainer\FPSAimTrainer\stats`
- `%LOCALAPPDATA%\FPSAimTrainer\FPSAimTrainer\stats`
- `%USERPROFILE%\AppData\Local\FPSAimTrainer\FPSAimTrainer\stats`
- `%USERPROFILE%\AppData\LocalLow\FPSAimTrainer\FPSAimTrainer\stats`
- `%USERPROFILE%\Documents\FPSAimTrainer\FPSAimTrainer\stats`

## Linux Notes

On native Linux, use `make bootstrap`, `npm run dev`, `npm run build`, `npm test`, and `npm run rust:test`.

Running the Tauri shell natively on Linux requires Linux WebKitGTK system packages even though Linux is not a supported app target. For Windows packaging, prefer GitHub Actions on `windows-latest` or a native Windows machine.

The Makefile intentionally does not install Linux Tauri desktop packages during `make bootstrap`. If you want to experiment with the native Linux Tauri shell anyway, run `make linux-tauri-deps`.
