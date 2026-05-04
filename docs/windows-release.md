# Windows Release Builds

The preferred release path is GitHub Actions on `windows-latest`. Native Windows builds avoid Linux WebKitGTK setup and avoid the rough edges of cross-compiling a Tauri desktop app from Linux.

## Portable Zip

Run the `Windows Portable` workflow from GitHub Actions. It creates:

```text
KovaaksProgressionTracker-windows-x64-portable.zip
```

The zip contains:

- `KovaaksProgressionTracker.exe`
- `README.txt`
- `dependencies/MicrosoftEdgeWebView2Setup.exe`

WebView2 is the only runtime dependency a normal Windows machine may need. Windows 10 and Windows 11 commonly already have it, but the bootstrapper is included so native Windows testing can be done offline except for the runtime installer itself.

## Local Windows Build

On a Windows machine:

```powershell
npm ci
npm run windows:build
npm run windows:portable
```

The zip is written to:

```text
artifacts/windows-portable/KovaaksProgressionTracker-windows-x64-portable.zip
```

## Arch Linux Development

Use Arch for frontend development and core logic checks:

```bash
npm run dev
npm run build
npm test
npm run rust:test
```

Do not use Arch as the primary Windows packaging path unless you deliberately want to set up a Windows cross-compilation toolchain. For this app, GitHub Actions or native Windows is simpler and closer to the actual target.
