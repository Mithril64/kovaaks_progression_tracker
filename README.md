# Kovaak's Progression Tracker

Local-first Windows desktop tracker for Kovaak's stats history, built with Tauri v2, React, TypeScript, and SQLite.

Windows is the supported product target. Linux is useful for frontend development and core Rust testing, but Linux desktop packages are not part of the release goal.

## Development

Fresh Ubuntu/WSL setup:

```bash
sudo apt-get update
sudo apt-get install -y make
make bootstrap
```

The bootstrap target installs base Ubuntu build tools, Node.js 22, Rust stable, npm dependencies, Playwright Chromium, and runs the verification suite.

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

## Windows Paths

The app auto-detects these Windows stats folders when they exist:

- `%LOCALAPPDATA%\FPSAimTrainer\FPSAimTrainer\stats`
- `%USERPROFILE%\AppData\Local\FPSAimTrainer\FPSAimTrainer\stats`
- `%USERPROFILE%\AppData\LocalLow\FPSAimTrainer\FPSAimTrainer\stats`
- `%USERPROFILE%\Documents\FPSAimTrainer\FPSAimTrainer\stats`

## Linux Notes

On native Linux, use `npm run dev`, `npm run build`, `npm test`, and `npm run rust:test`.

Running the Tauri shell natively on Linux requires Linux WebKitGTK system packages even though Linux is not a supported app target. For Windows packaging, prefer a Windows machine or WSL/CI setup specifically configured for Tauri Windows builds.

The Makefile intentionally does not install Linux Tauri desktop packages during `make bootstrap`. If you want to experiment with the native Linux Tauri shell anyway, run `make linux-tauri-deps`.
