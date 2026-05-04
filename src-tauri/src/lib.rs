mod benchmarks;
mod db;
mod error;
mod models;
mod parser;
mod providers;

use crate::{
    db::Database,
    models::ImportSummary,
    parser::parse_stats_file,
};
use std::path::Path;
use walkdir::WalkDir;

#[cfg(feature = "desktop")]
use crate::{
    benchmarks::{benchmark_progress, bundled_benchmarks},
    error::AppResult,
    models::{Benchmark, BenchmarkProgress, Dashboard, OnlineProfile, Run, Scenario},
};
#[cfg(feature = "desktop")]
use crate::error::AppError;
#[cfg(feature = "desktop")]
use std::path::PathBuf;
#[cfg(feature = "desktop")]
use std::{fs, sync::Mutex};
#[cfg(feature = "desktop")]
use tauri::Manager;

#[cfg(feature = "desktop")]
struct AppState {
    db: Mutex<Database>,
    benchmarks: Vec<Benchmark>,
}

#[cfg(feature = "desktop")]
#[tauri::command]
fn detect_stats_folders() -> AppResult<Vec<String>> {
    let mut candidates = Vec::new();

    if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA").map(PathBuf::from) {
        candidates.push(local_app_data.join("FPSAimTrainer/FPSAimTrainer/stats"));
    }

    if let Some(profile) = std::env::var_os("USERPROFILE").map(PathBuf::from) {
        candidates.push(profile.join("AppData/Local/FPSAimTrainer/FPSAimTrainer/stats"));
        candidates.push(profile.join("AppData/LocalLow/FPSAimTrainer/FPSAimTrainer/stats"));
        candidates.push(profile.join("Documents/FPSAimTrainer/FPSAimTrainer/stats"));
    }

    let existing = candidates
        .into_iter()
        .filter(|path| path.is_dir())
        .map(|path| path.to_string_lossy().to_string())
        .collect();
    Ok(existing)
}

#[cfg(feature = "desktop")]
#[tauri::command]
fn select_stats_folder(app: tauri::AppHandle) -> AppResult<Option<String>> {
    use tauri_plugin_dialog::DialogExt;

    let folder = app.dialog().file().blocking_pick_folder();
    Ok(folder.map(|path| path.to_string()))
}

#[cfg(feature = "desktop")]
#[tauri::command]
fn import_stats(state: tauri::State<'_, AppState>, folder: String) -> AppResult<ImportSummary> {
    let root = PathBuf::from(&folder);
    if !root.is_dir() {
        return Err(AppError::Message(format!("stats folder does not exist: {folder}")));
    }

    let db = state.db.lock().map_err(|_| AppError::Message("database lock poisoned".to_string()))?;
    import_folder(&db, &root).map_err(AppError::from)
}

#[cfg(feature = "desktop")]
#[tauri::command]
fn watch_stats_folder(folder: String) -> AppResult<bool> {
    Ok(Path::new(&folder).is_dir())
}

#[cfg(feature = "desktop")]
#[tauri::command]
fn get_dashboard(state: tauri::State<'_, AppState>) -> AppResult<Dashboard> {
    let db = state.db.lock().map_err(|_| AppError::Message("database lock poisoned".to_string()))?;
    db.dashboard().map_err(AppError::from)
}

#[cfg(feature = "desktop")]
#[tauri::command]
fn get_scenarios(state: tauri::State<'_, AppState>) -> AppResult<Vec<Scenario>> {
    let db = state.db.lock().map_err(|_| AppError::Message("database lock poisoned".to_string()))?;
    db.scenarios(None).map_err(AppError::from)
}

#[cfg(feature = "desktop")]
#[tauri::command]
fn get_scenario_runs(state: tauri::State<'_, AppState>, scenario_id: i64) -> AppResult<Vec<Run>> {
    let db = state.db.lock().map_err(|_| AppError::Message("database lock poisoned".to_string()))?;
    db.scenario_runs(scenario_id).map_err(AppError::from)
}

#[cfg(feature = "desktop")]
#[tauri::command]
fn get_benchmarks(state: tauri::State<'_, AppState>) -> AppResult<Vec<Benchmark>> {
    Ok(state.benchmarks.clone())
}

#[cfg(feature = "desktop")]
#[tauri::command]
fn get_benchmark_progress(
    state: tauri::State<'_, AppState>,
    benchmark_id: String,
) -> AppResult<BenchmarkProgress> {
    let db = state.db.lock().map_err(|_| AppError::Message("database lock poisoned".to_string()))?;
    benchmark_progress(&db, &state.benchmarks, &benchmark_id).map_err(AppError::from)
}

#[cfg(feature = "desktop")]
#[tauri::command]
fn resolve_online_profile(provider: String, handle: String) -> AppResult<OnlineProfile> {
    Ok(providers::resolve_online_profile(provider, handle))
}

pub fn import_folder(db: &Database, root: &Path) -> anyhow::Result<ImportSummary> {
    let mut summary = ImportSummary::default();

    for entry in WalkDir::new(root)
        .follow_links(false)
        .into_iter()
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_file())
        .filter(|entry| is_stats_candidate(entry.path()))
    {
        match parse_stats_file(entry.path()) {
            Ok(run) => match db.insert_run(&run)? {
                true => summary.imported += 1,
                false => summary.duplicates += 1,
            },
            Err(error) => {
                summary.failed += 1;
                summary.errors.push(format!("{}: {error}", entry.path().display()));
            }
        }
    }

    Ok(summary)
}

fn is_stats_candidate(path: &Path) -> bool {
    matches!(
        path.extension().and_then(|extension| extension.to_str()).map(str::to_ascii_lowercase),
        Some(extension) if matches!(extension.as_str(), "csv" | "txt" | "json")
    )
}

#[cfg(feature = "desktop")]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_dir = app.path().app_data_dir()?;
            fs::create_dir_all(&app_dir)?;
            let db = Database::open(app_dir.join("tracker.sqlite3"))?;
            let benchmarks = bundled_benchmarks()?;
            app.manage(AppState {
                db: Mutex::new(db),
                benchmarks,
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            select_stats_folder,
            detect_stats_folders,
            import_stats,
            watch_stats_folder,
            get_scenarios,
            get_scenario_runs,
            get_dashboard,
            get_benchmarks,
            get_benchmark_progress,
            resolve_online_profile
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn imports_fixture_folder() {
        let db = Database::in_memory().expect("db opens");
        let summary = import_folder(&db, Path::new("../fixtures/stats")).expect("import succeeds");
        assert_eq!(summary.imported, 2);
        assert_eq!(summary.failed, 1);
    }
}
