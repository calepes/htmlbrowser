use std::path::{Path, PathBuf};

use serde::Serialize;

use crate::paths::extension_lower;

const PREVIEWABLE_EXTENSIONS: &[&str] = &["html", "htm"];
const SKIP_DIRS: &[&str] = &[
    "node_modules",
    "target",
    "dist",
    "build",
    ".git",
    ".next",
    ".turbo",
    ".cache",
    ".svelte-kit",
    ".nuxt",
    ".astro",
    ".vercel",
    ".idea",
    ".vscode",
];

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DirEntryDto {
    pub name: String,
    pub path: PathBuf,
    pub kind: &'static str,
    pub modified_ms: Option<u64>,
    pub children: Option<Vec<DirEntryDto>>,
}

pub fn scan_workspace(root: &Path) -> Vec<DirEntryDto> {
    scan_dir(root).unwrap_or_default()
}

fn scan_dir(dir: &Path) -> Option<Vec<DirEntryDto>> {
    let mut entries: Vec<DirEntryDto> = Vec::new();
    let read = std::fs::read_dir(dir).ok()?;

    for entry in read.flatten() {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        if name.starts_with('.') {
            continue;
        }

        let metadata = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };

        if metadata.is_dir() {
            if SKIP_DIRS.iter().any(|d| *d == name) {
                continue;
            }
            let children = scan_dir(&path).unwrap_or_default();
            if children.is_empty() {
                continue;
            }
            entries.push(DirEntryDto {
                name,
                path,
                kind: "directory",
                modified_ms: None,
                children: Some(children),
            });
        } else if metadata.is_file() {
            let ext = extension_lower(&path);
            if !PREVIEWABLE_EXTENSIONS.iter().any(|e| *e == ext) {
                continue;
            }
            let modified_ms = metadata
                .modified()
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_millis() as u64);
            entries.push(DirEntryDto {
                name,
                path,
                kind: "file",
                modified_ms,
                children: None,
            });
        }
    }

    Some(entries)
}

#[tauri::command]
pub async fn read_directory(path: PathBuf) -> Vec<DirEntryDto> {
    scan_dir(&path).unwrap_or_default()
}

#[tauri::command]
pub async fn read_workspace_file(path: PathBuf) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HtmlInspection {
    pub has_scripts: bool,
    pub has_external_resources: bool,
}

const INSPECT_LIMIT: usize = 2 * 1024 * 1024;

#[tauri::command]
pub async fn inspect_html(path: PathBuf) -> Result<HtmlInspection, String> {
    let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
    let slice: &[u8] = if bytes.len() > INSPECT_LIMIT {
        &bytes[..INSPECT_LIMIT]
    } else {
        &bytes
    };
    let lower = String::from_utf8_lossy(slice).to_ascii_lowercase();
    let has_scripts = lower.contains("<script")
        || lower.contains(" onclick=")
        || lower.contains(" onload=")
        || lower.contains(" onchange=")
        || lower.contains(" onsubmit=");
    let has_external_resources = lower.contains("https://") || lower.contains("http://");
    Ok(HtmlInspection {
        has_scripts,
        has_external_resources,
    })
}
