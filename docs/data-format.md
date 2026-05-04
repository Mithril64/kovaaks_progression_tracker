# Kovaak's Stats Import Notes

The importer is intentionally forgiving because Kovaak's local stats exports and community tools have used slightly different CSV layouts over time.

The current parser supports:

- CSV files with a header row and at least a score field.
- Key/value text files using `:` or `=`.
- Scenario names from `Scenario`, `Scenario Name`, `Challenge`, `Challenge Name`, `Map`, or `Map Name`.
- Scores from `Score`, `Final Score`, `High Score`, or `Score Damage`.
- Accuracy as either `0.912` or `91.2`.
- Dates in RFC3339, `YYYY-MM-DD HH:MM:SS`, `YYYY.MM.DD-HH.MM.SS`, `YYYY/MM/DD HH:MM:SS`, or `MM/DD/YYYY HH:MM:SS`.

Each source file is deduplicated by SHA-256 hash. The raw normalized fields are kept in SQLite so newer Kovaak's metrics can be surfaced later without re-importing original files.
