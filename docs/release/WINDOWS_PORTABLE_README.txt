Kovaak's Progression Tracker - Windows Portable Build

Run:
  KovaaksProgressionTracker.exe

Windows 10 and Windows 11 usually already include the Microsoft Edge WebView2 Runtime.
If the app fails to start and mentions WebView2, run:
  dependencies\MicrosoftEdgeWebView2Setup.exe

The app stores its SQLite database in the normal Windows app data directory.
Your Kovaak's stats are imported from local FPSAimTrainer stats folders; no hosted service is required.

Supported target:
  Windows x64

Notes:
  This zip is intended for native Windows testing. Do not run it from WSL.
