use notify::{
    event::{CreateKind, EventKind, ModifyKind, RemoveKind, RenameMode},
    Config, Event, RecommendedWatcher, RecursiveMode, Watcher,
};
use serde::Serialize;
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::mpsc::{channel, Receiver, RecvTimeoutError, Sender};
use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

const DEBOUNCE_MS: u64 = 300;

#[derive(Debug)]
pub struct WatcherHandle {
    /// Holding the watcher alive keeps file events flowing. Dropping it stops them.
    _watcher: RecommendedWatcher,
    /// Signals the worker thread to exit.
    stop_tx: Sender<()>,
}

impl WatcherHandle {
    pub fn shutdown(self) {
        let _ = self.stop_tx.send(());
        // Drop the watcher off-thread because notify's FSEvents teardown
        // can briefly block on macOS.
        thread::spawn(move || drop(self));
    }
}

#[derive(Debug, Serialize, Clone, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum FileChangeKind {
    Modified,
    Created,
    Removed,
    Renamed,
}

#[derive(Debug, Serialize, Clone)]
pub struct FileChangePayload {
    pub workspace: PathBuf,
    pub path: PathBuf,
    pub kind: FileChangeKind,
}

#[derive(Debug, Serialize, Clone)]
pub struct DirectoryChangePayload {
    pub workspace: PathBuf,
    pub path: PathBuf,
}

pub fn start(
    app: AppHandle,
    workspace: PathBuf,
    epoch: u64,
    epoch_check: Arc<dyn Fn() -> u64 + Send + Sync>,
) -> notify::Result<WatcherHandle> {
    let (tx, rx) = channel::<notify::Result<Event>>();
    let mut watcher = RecommendedWatcher::new(
        move |res| {
            let _ = tx.send(res);
        },
        Config::default(),
    )?;
    watcher.watch(&workspace, RecursiveMode::Recursive)?;

    let (stop_tx, stop_rx) = channel::<()>();

    let workspace_for_thread = workspace.clone();
    thread::Builder::new()
        .name("htmlbrowser-watcher".into())
        .spawn(move || {
            run_event_loop(app, workspace_for_thread, epoch, epoch_check, rx, stop_rx);
        })
        .ok();

    Ok(WatcherHandle {
        _watcher: watcher,
        stop_tx,
    })
}

fn run_event_loop(
    app: AppHandle,
    workspace: PathBuf,
    epoch: u64,
    epoch_check: Arc<dyn Fn() -> u64 + Send + Sync>,
    rx: Receiver<notify::Result<Event>>,
    stop_rx: Receiver<()>,
) {
    let mut pending_files: HashSet<(PathBuf, FileChangeKind)> = HashSet::new();
    let mut pending_dirs: HashSet<PathBuf> = HashSet::new();
    let mut last_event: Option<Instant> = None;

    loop {
        if stop_rx.try_recv().is_ok() {
            return;
        }

        match rx.recv_timeout(Duration::from_millis(DEBOUNCE_MS)) {
            Ok(Ok(event)) => {
                if (epoch_check)() != epoch {
                    return;
                }
                absorb_event(&workspace, event, &mut pending_files, &mut pending_dirs);
                last_event = Some(Instant::now());
            }
            Ok(Err(_)) => {
                // Notify error — keep going.
            }
            Err(RecvTimeoutError::Timeout) => {
                // No events for DEBOUNCE_MS — flush.
                let should_flush = last_event
                    .map(|t| t.elapsed() >= Duration::from_millis(DEBOUNCE_MS))
                    .unwrap_or(false);
                if should_flush {
                    if (epoch_check)() != epoch {
                        return;
                    }
                    flush(&app, &workspace, &mut pending_files, &mut pending_dirs);
                    last_event = None;
                }
            }
            Err(RecvTimeoutError::Disconnected) => return,
        }
    }
}

fn absorb_event(
    workspace: &Path,
    event: Event,
    pending_files: &mut HashSet<(PathBuf, FileChangeKind)>,
    pending_dirs: &mut HashSet<PathBuf>,
) {
    let kind = classify(&event.kind);

    for path in event.paths {
        if !path.starts_with(workspace) {
            continue;
        }
        if path.is_dir() {
            pending_dirs.insert(path);
        } else if matches!(
            event.kind,
            EventKind::Remove(_) | EventKind::Modify(ModifyKind::Name(_))
        ) {
            // For removes/renames, the path may not exist anymore;
            // record both a file event and a directory refresh on the parent.
            if let Some(parent) = path.parent() {
                pending_dirs.insert(parent.to_path_buf());
            }
            if let Some(k) = kind.clone() {
                pending_files.insert((path, k));
            }
        } else {
            if let Some(k) = kind.clone() {
                pending_files.insert((path.clone(), k));
            }
            if let Some(parent) = path.parent() {
                pending_dirs.insert(parent.to_path_buf());
            }
        }
    }
}

fn flush(
    app: &AppHandle,
    workspace: &Path,
    pending_files: &mut HashSet<(PathBuf, FileChangeKind)>,
    pending_dirs: &mut HashSet<PathBuf>,
) {
    for (path, kind) in pending_files.drain() {
        let payload = FileChangePayload {
            workspace: workspace.to_path_buf(),
            path,
            kind,
        };
        let _ = app.emit("fs:file-changed", payload);
    }
    for path in pending_dirs.drain() {
        let payload = DirectoryChangePayload {
            workspace: workspace.to_path_buf(),
            path,
        };
        let _ = app.emit("fs:directory-changed", payload);
    }
}

fn classify(kind: &EventKind) -> Option<FileChangeKind> {
    match kind {
        EventKind::Create(CreateKind::File | CreateKind::Any) => Some(FileChangeKind::Created),
        EventKind::Modify(ModifyKind::Data(_) | ModifyKind::Any) => Some(FileChangeKind::Modified),
        EventKind::Modify(ModifyKind::Name(RenameMode::Any | RenameMode::Both)) => {
            Some(FileChangeKind::Renamed)
        }
        EventKind::Remove(RemoveKind::File | RemoveKind::Any) => Some(FileChangeKind::Removed),
        _ => None,
    }
}
