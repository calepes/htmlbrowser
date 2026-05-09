use std::path::{Path, PathBuf};

/// Canonicalize a path, falling back to the input if canonicalization fails
/// (e.g. the file no longer exists). On macOS, this also resolves
/// `/var` -> `/private/var` so paths match what FSEvents emits.
pub fn canonicalize_or(path: &Path) -> PathBuf {
    std::fs::canonicalize(path).unwrap_or_else(|_| path.to_path_buf())
}

/// Returns true if `child` is the same as `parent` or sits underneath it.
pub fn is_within(parent: &Path, child: &Path) -> bool {
    let parent = canonicalize_or(parent);
    let child = canonicalize_or(child);
    child.starts_with(parent)
}

/// Lowercase extension without leading dot, or empty string.
pub fn extension_lower(path: &Path) -> String {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_ascii_lowercase())
        .unwrap_or_default()
}
