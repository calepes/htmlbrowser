use std::path::PathBuf;

use tauri::{AppHandle, Manager};

use crate::paths::canonicalize_or;
use crate::state::{AppState, TrustMode};
use crate::storage;

#[tauri::command]
pub async fn get_trust_mode(app: AppHandle, workspace: PathBuf) -> TrustMode {
    let canonical = canonicalize_or(&workspace);
    let state = app.state::<AppState>().inner().clone();
    let s = state.lock();
    s.workspace_settings
        .get(&canonical)
        .copied()
        .unwrap_or_default()
}

#[tauri::command]
pub async fn set_trust_mode(app: AppHandle, workspace: PathBuf, mode: TrustMode) {
    let canonical = canonicalize_or(&workspace);

    let snapshot = {
        let state = app.state::<AppState>().inner().clone();
        let mut s = state.lock();
        s.workspace_settings.insert(canonical.clone(), mode);
        s.workspace_settings.clone()
    };

    storage::write_settings(
        &app,
        &storage::PersistedSettings {
            workspaces: snapshot,
        },
    );
}
