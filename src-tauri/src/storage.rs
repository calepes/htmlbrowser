use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use crate::state::TrustMode;

const RECENTS_FILE: &str = "recents.json";
const SETTINGS_FILE: &str = "workspace_settings.json";
const LAST_FILE: &str = "last_workspace.json";
const MAX_RECENTS: usize = 12;

#[derive(Default, Debug, Serialize, Deserialize)]
pub struct PersistedSettings {
    #[serde(default)]
    pub workspaces: HashMap<PathBuf, TrustMode>,
}

pub fn data_dir(app: &AppHandle) -> PathBuf {
    app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."))
}

fn ensure_dir(dir: &Path) {
    let _ = fs::create_dir_all(dir);
}

pub fn read_recents(app: &AppHandle) -> Vec<PathBuf> {
    let path = data_dir(app).join(RECENTS_FILE);
    fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str::<Vec<PathBuf>>(&s).ok())
        .unwrap_or_default()
}

pub fn write_recents(app: &AppHandle, recents: &[PathBuf]) {
    let dir = data_dir(app);
    ensure_dir(&dir);
    let path = dir.join(RECENTS_FILE);
    if let Ok(json) = serde_json::to_string_pretty(recents) {
        let _ = fs::write(path, json);
    }
}

pub fn push_recent(app: &AppHandle, root: &Path) -> Vec<PathBuf> {
    let mut current = read_recents(app);
    current.retain(|p| p != root);
    current.insert(0, root.to_path_buf());
    if current.len() > MAX_RECENTS {
        current.truncate(MAX_RECENTS);
    }
    write_recents(app, &current);
    current
}

pub fn remove_recent(app: &AppHandle, root: &Path) -> Vec<PathBuf> {
    let mut current = read_recents(app);
    current.retain(|p| p != root);
    write_recents(app, &current);
    current
}

pub fn read_last_workspace(app: &AppHandle) -> Option<PathBuf> {
    let path = data_dir(app).join(LAST_FILE);
    fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str::<Option<PathBuf>>(&s).ok())
        .flatten()
}

pub fn write_last_workspace(app: &AppHandle, root: Option<&Path>) {
    let dir = data_dir(app);
    ensure_dir(&dir);
    let path = dir.join(LAST_FILE);
    let value: Option<PathBuf> = root.map(|p| p.to_path_buf());
    if let Ok(json) = serde_json::to_string_pretty(&value) {
        let _ = fs::write(path, json);
    }
}

pub fn read_settings(app: &AppHandle) -> PersistedSettings {
    let path = data_dir(app).join(SETTINGS_FILE);
    fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str::<PersistedSettings>(&s).ok())
        .unwrap_or_default()
}

pub fn write_settings(app: &AppHandle, settings: &PersistedSettings) {
    let dir = data_dir(app);
    ensure_dir(&dir);
    let path = dir.join(SETTINGS_FILE);
    if let Ok(json) = serde_json::to_string_pretty(settings) {
        let _ = fs::write(path, json);
    }
}
