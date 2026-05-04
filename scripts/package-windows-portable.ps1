param(
  [string]$Configuration = "release",
  [string]$PackageName = "KovaaksProgressionTracker-windows-x64-portable"
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ExePath = Join-Path $RepoRoot "src-tauri\target\$Configuration\kovaaks-progression-tracker.exe"
$ArtifactsDir = Join-Path $RepoRoot "artifacts\windows-portable"
$PackageDir = Join-Path $ArtifactsDir $PackageName
$DependenciesDir = Join-Path $PackageDir "dependencies"
$ZipPath = Join-Path $ArtifactsDir "$PackageName.zip"

if (!(Test-Path $ExePath)) {
  throw "Expected Windows executable was not found: $ExePath"
}

Remove-Item $PackageDir -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $ZipPath -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $DependenciesDir | Out-Null

Copy-Item $ExePath (Join-Path $PackageDir "KovaaksProgressionTracker.exe")
Copy-Item (Join-Path $RepoRoot "docs\release\WINDOWS_PORTABLE_README.txt") (Join-Path $PackageDir "README.txt")

$ReleaseDir = Split-Path $ExePath -Parent
Get-ChildItem $ReleaseDir -Filter "*.dll" -File -ErrorAction SilentlyContinue | ForEach-Object {
  Copy-Item $_.FullName (Join-Path $PackageDir $_.Name)
}

$ResourcesDir = Join-Path $ReleaseDir "resources"
if (Test-Path $ResourcesDir) {
  Copy-Item $ResourcesDir (Join-Path $PackageDir "resources") -Recurse
}

$WebView2Bootstrapper = Join-Path $DependenciesDir "MicrosoftEdgeWebView2Setup.exe"
Invoke-WebRequest `
  -Uri "https://go.microsoft.com/fwlink/p/?LinkId=2124703" `
  -OutFile $WebView2Bootstrapper

Compress-Archive -Path (Join-Path $PackageDir "*") -DestinationPath $ZipPath -CompressionLevel Optimal

Write-Host "Portable package created:"
Write-Host $ZipPath
