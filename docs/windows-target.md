# Windows Target

This project is intentionally Windows-first because Kovaak's and its local stats folder are Windows-centered.

Supported product target:

- Windows desktop app
- Tauri v2 shell
- SQLite stored in the Windows app data directory
- Stats import from Windows `FPSAimTrainer/FPSAimTrainer/stats` folders
- Windows installers via Tauri `msi` and `nsis` bundle targets

Linux development scope:

- Vite frontend development
- TypeScript build and Vitest tests
- Core Rust tests for parser, importer, SQLite, and benchmark logic

Linux desktop builds are not a product target. Native Linux Tauri compilation still pulls in WebKitGTK, so missing `webkit2gtk-4.1` or `javascriptcoregtk-4.1` packages are environment issues, not app requirements.

Use these commands:

```bash
npm run dev
npm run build
npm test
npm run rust:test
```

Use these commands on Windows or a Windows-capable build setup:

```bash
npm run windows:dev
npm run windows:build
```
