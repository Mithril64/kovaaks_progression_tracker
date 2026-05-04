CREATE TABLE IF NOT EXISTS migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scenarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  normalized_name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scenario_id INTEGER NOT NULL REFERENCES scenarios(id),
  score REAL NOT NULL,
  accuracy REAL,
  kills INTEGER,
  weapon TEXT,
  played_at TEXT NOT NULL,
  source_file TEXT NOT NULL,
  source_hash TEXT NOT NULL UNIQUE,
  raw_json TEXT NOT NULL,
  imported_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_runs_scenario_played ON runs(scenario_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_played ON runs(played_at DESC);
CREATE INDEX IF NOT EXISTS idx_scenarios_normalized ON scenarios(normalized_name);
