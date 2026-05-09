use std::path::{Path, PathBuf};
use std::sync::Arc;

use serde::Serialize;
use tauri::{AppHandle, Manager};

use crate::commands::fs::{scan_workspace, DirEntryDto};
use crate::paths::canonicalize_or;
use crate::state::{AppState, TrustMode};
use crate::storage;
use crate::watcher;

#[derive(Debug, Serialize)]
pub struct WorkspaceTree {
    pub root: PathBuf,
    pub entries: Vec<DirEntryDto>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StartupBundle {
    pub recent_workspaces: Vec<PathBuf>,
    pub last_workspace: Option<PathBuf>,
}

#[tauri::command]
pub async fn get_startup_state(app: AppHandle) -> StartupBundle {
    let recent_workspaces = storage::read_recents(&app);
    let last_workspace = storage::read_last_workspace(&app);

    {
        let state = app.state::<AppState>().inner().clone();
        let mut s = state.lock();
        s.recent_workspaces.clone_from(&recent_workspaces);
        s.last_workspace.clone_from(&last_workspace);
        let persisted = storage::read_settings(&app);
        s.workspace_settings = persisted.workspaces;
    }

    StartupBundle {
        recent_workspaces,
        last_workspace,
    }
}

#[tauri::command]
pub async fn open_workspace(app: AppHandle, root: PathBuf) -> Result<WorkspaceTree, String> {
    let canonical = canonicalize_or(&root);
    if !canonical.is_dir() {
        return Err(format!("not a directory: {}", canonical.display()));
    }

    // Bump epoch and stash watcher so we can shut it down outside the lock.
    let old_watcher = {
        let state = app.state::<AppState>().inner().clone();
        let mut s = state.lock();
        s.epoch = s.epoch.wrapping_add(1);
        s.workspace_root = Some(canonical.clone());
        s.last_workspace = Some(canonical.clone());
        s.recent_writes.clear();
        s.watcher.take()
    };
    if let Some(w) = old_watcher {
        w.shutdown();
    }

    storage::write_last_workspace(&app, Some(&canonical));

    // Start a fresh watcher for this workspace.
    let state_for_check: AppState = app.state::<AppState>().inner().clone();
    let epoch = {
        let s = state_for_check.lock();
        s.epoch
    };
    let epoch_check: Arc<dyn Fn() -> u64 + Send + Sync> = {
        let state = state_for_check.clone();
        Arc::new(move || state.lock().epoch)
    };

    match watcher::start(app.clone(), canonical.clone(), epoch, epoch_check) {
        Ok(handle) => {
            let state = app.state::<AppState>().inner().clone();
            state.lock().watcher = Some(handle);
        }
        Err(err) => {
            eprintln!("watcher start failed: {err}");
        }
    }

    let entries = scan_workspace(&canonical);
    Ok(WorkspaceTree {
        root: canonical,
        entries,
    })
}

#[tauri::command]
pub async fn push_recent_workspace(app: AppHandle, root: PathBuf) -> Vec<PathBuf> {
    let canonical = canonicalize_or(&root);
    let updated = storage::push_recent(&app, &canonical);
    let state = app.state::<AppState>().inner().clone();
    state.lock().recent_workspaces.clone_from(&updated);
    updated
}

#[tauri::command]
pub async fn remove_recent_workspace(app: AppHandle, root: PathBuf) -> Vec<PathBuf> {
    let canonical = canonicalize_or(&root);
    let updated = storage::remove_recent(&app, &canonical);
    let state = app.state::<AppState>().inner().clone();
    state.lock().recent_workspaces.clone_from(&updated);
    updated
}

#[allow(dead_code)]
pub fn current_workspace(app: &AppHandle) -> Option<PathBuf> {
    let state = app.state::<AppState>().inner().clone();
    let s = state.lock();
    s.workspace_root.clone()
}

#[allow(dead_code)]
pub fn current_trust(app: &AppHandle, root: &Path) -> TrustMode {
    let state = app.state::<AppState>().inner().clone();
    let s = state.lock();
    s.workspace_settings.get(root).copied().unwrap_or_default()
}
