use std::path::PathBuf;

use serde::Serialize;
use walkdir::WalkDir;

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

const MAX_FILE_BYTES: u64 = 4 * 1024 * 1024;
const MAX_MATCHES_PER_FILE: usize = 20;
const MAX_TOTAL_MATCHES: usize = 500;
const SNIPPET_CONTEXT: usize = 80;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchMatch {
    pub path: PathBuf,
    pub name: String,
    pub line_number: u32,
    pub before: String,
    pub hit: String,
    pub after: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResults {
    pub matches: Vec<SearchMatch>,
    pub truncated: bool,
}

#[tauri::command]
pub async fn search_workspace(
    root: PathBuf,
    query: String,
    case_sensitive: Option<bool>,
) -> Result<SearchResults, String> {
    let query = query.trim();
    if query.is_empty() {
        return Ok(SearchResults {
            matches: Vec::new(),
            truncated: false,
        });
    }
    if !root.is_dir() {
        return Err(format!("not a directory: {}", root.display()));
    }

    let case_sensitive = case_sensitive.unwrap_or(false);
    let needle = if case_sensitive {
        query.to_string()
    } else {
        query.to_ascii_lowercase()
    };
    let needle_len = needle.len();

    let mut matches: Vec<SearchMatch> = Vec::new();
    let mut truncated = false;

    let walker = WalkDir::new(&root)
        .follow_links(false)
        .into_iter()
        .filter_entry(|e| {
            if e.depth() == 0 {
                return true;
            }
            let name = e.file_name().to_string_lossy();
            if name.starts_with('.') {
                return false;
            }
            if e.file_type().is_dir() {
                !SKIP_DIRS.iter().any(|d| *d == name)
            } else {
                true
            }
        });

    'outer: for entry in walker.flatten() {
        if !entry.file_type().is_file() {
            continue;
        }
        let path = entry.path();
        let ext = extension_lower(path);
        if !PREVIEWABLE_EXTENSIONS.iter().any(|e| *e == ext) {
            continue;
        }
        let meta = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };
        if meta.len() > MAX_FILE_BYTES {
            continue;
        }
        let content = match std::fs::read_to_string(path) {
            Ok(c) => c,
            Err(_) => continue,
        };
        let name = entry.file_name().to_string_lossy().to_string();

        let mut per_file = 0usize;
        for (idx, line) in content.lines().enumerate() {
            let haystack_owned;
            let haystack: &str = if case_sensitive {
                line
            } else {
                haystack_owned = line.to_ascii_lowercase();
                &haystack_owned[..]
            };

            let mut start = 0usize;
            while start <= haystack.len() {
                let found = match haystack[start..].find(&needle) {
                    Some(i) => i,
                    None => break,
                };
                let col = start + found;
                let (before, hit, after) = build_snippet(line, col, needle_len);
                matches.push(SearchMatch {
                    path: path.to_path_buf(),
                    name: name.clone(),
                    line_number: (idx as u32) + 1,
                    before,
                    hit,
                    after,
                });
                per_file += 1;
                if matches.len() >= MAX_TOTAL_MATCHES {
                    truncated = true;
                    break 'outer;
                }
                if per_file >= MAX_MATCHES_PER_FILE {
                    break;
                }
                start = col + needle_len.max(1);
            }
            if per_file >= MAX_MATCHES_PER_FILE {
                break;
            }
        }
    }

    Ok(SearchResults { matches, truncated })
}

fn build_snippet(line: &str, col: usize, match_len: usize) -> (String, String, String) {
    let end = col + match_len;

    let mut pre_start = col.saturating_sub(SNIPPET_CONTEXT);
    while pre_start > 0 && !line.is_char_boundary(pre_start) {
        pre_start -= 1;
    }
    let mut post_end = (end + SNIPPET_CONTEXT).min(line.len());
    while post_end < line.len() && !line.is_char_boundary(post_end) {
        post_end += 1;
    }

    let raw_before = &line[pre_start..col];
    let hit = line[col..end].to_string();
    let mut after = line[end..post_end].to_string();

    let trimmed = raw_before.trim_start();
    let mut before = if pre_start > 0 || trimmed.len() != raw_before.len() {
        let mut s = String::with_capacity(trimmed.len() + 3);
        s.push('…');
        s.push_str(trimmed);
        s
    } else {
        trimmed.to_string()
    };

    if post_end < line.len() {
        after.push('…');
    }

    if before.is_empty() && hit.is_empty() && after.is_empty() {
        before = String::new();
    }

    (before, hit, after)
}
