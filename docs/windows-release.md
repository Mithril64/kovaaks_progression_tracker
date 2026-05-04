# Windows Release Builds

The preferred release path is GitHub Actions on `windows-latest`. Native Windows builds avoid Linux WebKitGTK setup and avoid the rough edges of cross-compiling a Tauri desktop app from Linux.

The portable workflow intentionally uses `cargo build --release --features desktop` instead of `tauri build`. That avoids generating MSI/NSIS installers and avoids running the frontend build twice. The workflow builds the frontend once, compiles the Windows executable once, and zips the result.

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

## Terminal-Only GitHub Release

Install and authenticate the GitHub CLI, then trigger the workflow from your terminal:

```bash
gh auth login
gh workflow run windows-portable.yml -f tag=v0.1.0
gh run watch
```

When the workflow completes, the zip is attached to the GitHub release for the tag you passed.

To download it from the terminal:

```bash
gh release download v0.1.0 --pattern '*portable.zip' --dir artifacts/downloaded
```

Equivalent Makefile commands:

```bash
make github-release TAG=v0.1.0
make github-release-watch
make github-release-download TAG=v0.1.0
```

## Local Windows Build

On a Windows machine:

```powershell
npm ci
npm run build
npm run windows:cargo-build
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

Cross-compiling a Tauri Windows app from Arch is theoretically possible, but it adds MinGW/MSVC target differences and Windows resource/linking issues. The current supported terminal-only path is `gh workflow run`, which still keeps the whole release process in your terminal while compiling on a real Windows runner.
