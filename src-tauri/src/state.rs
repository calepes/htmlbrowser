use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Instant;

use crate::watcher::WatcherHandle;

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum TrustMode {
    Safe,
    Trusted,
}

impl Default for TrustMode {
    fn default() -> Self {
        TrustMode::Safe
    }
}

#[derive(Default, Debug)]
pub struct AppStateInner {
    pub workspace_root: Option<PathBuf>,
    pub workspace_settings: HashMap<PathBuf, TrustMode>,
    pub recent_workspaces: Vec<PathBuf>,
    pub last_workspace: Option<PathBuf>,
    pub watcher: Option<WatcherHandle>,
    /// Files we have written to in the recent past — used to suppress
    /// our own write events from the watcher.
    pub recent_writes: HashMap<PathBuf, Instant>,
    /// Bumped on every workspace change — used to drop stale watcher events.
    pub epoch: u64,
}

pub type AppState = Arc<Mutex<AppStateInner>>;

pub fn new_state() -> AppState {
    Arc::new(Mutex::new(AppStateInner::default()))
}
