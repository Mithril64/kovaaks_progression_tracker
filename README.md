# Kovaak's Progression Tracker

Local-first Windows desktop tracker for Kovaak's stats history, built with Tauri v2, React, TypeScript, and SQLite.

Windows is the supported product target. Linux is useful for frontend development and core Rust testing, but Linux desktop packages are not part of the release goal. Windows release builds should be produced on native Windows or through GitHub Actions.

## Development

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

## Windows Portable Build

The preferred packaging path is GitHub Actions. Run the `Windows Portable` workflow to produce:

```text
KovaaksProgressionTracker-windows-x64-portable.zip
```

The zip contains the Windows executable, a quick-start README, and a WebView2 bootstrapper under `dependencies/`.

For a local native Windows build:

```powershell
npm ci
npm run windows:build
npm run windows:portable
```

See [docs/windows-release.md](docs/windows-release.md).

## Windows Paths

The app auto-detects these Windows stats folders when they exist:

- `%LOCALAPPDATA%\FPSAimTrainer\FPSAimTrainer\stats`
- `%USERPROFILE%\AppData\Local\FPSAimTrainer\FPSAimTrainer\stats`
- `%USERPROFILE%\AppData\LocalLow\FPSAimTrainer\FPSAimTrainer\stats`
- `%USERPROFILE%\Documents\FPSAimTrainer\FPSAimTrainer\stats`

## Linux Notes

On native Linux, use `make bootstrap`, `npm run dev`, `npm run build`, `npm test`, and `npm run rust:test`.

Running the Tauri shell natively on Linux requires Linux WebKitGTK system packages even though Linux is not a supported app target. For Windows packaging, prefer GitHub Actions on `windows-latest` or a native Windows machine.

The Makefile intentionally does not install Linux Tauri desktop packages during `make bootstrap`. If you want to experiment with the native Linux Tauri shell anyway, run `make linux-tauri-deps`.
