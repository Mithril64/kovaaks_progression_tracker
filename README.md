# Kovaak's Progression Tracker

Local-first desktop tracker for Kovaak's stats history, built with Tauri v2, React, TypeScript, and SQLite.

## Development

```bash
npm install
npm run tauri:dev
```

For frontend-only work:

```bash
npm run dev
```

## Verification

```bash
npm run build
cd src-tauri && cargo test
```

The browser-only Vite app uses mock data. The Tauri app persists imported stats to SQLite in the app data directory.
