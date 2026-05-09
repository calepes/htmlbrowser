use std::path::PathBuf;

use percent_encoding::{utf8_percent_encode, AsciiSet, NON_ALPHANUMERIC};
use tauri::{AppHandle, LogicalPosition, LogicalSize, Manager, WebviewUrl, Wry};

use crate::state::{AppState, TrustMode};

const PATH_ENCODE: &AsciiSet = &NON_ALPHANUMERIC
    .remove(b'/')
    .remove(b'-')
    .remove(b'_')
    .remove(b'.')
    .remove(b'~');

#[tauri::command]
pub async fn show_preview(
    app: AppHandle,
    label: String,
    file: Option<PathBuf>,
    trust: TrustMode,
    token: u64,
) -> Result<(), String> {
    // Persist trust on the active workspace so the protocol handler picks it up.
    if let Some(root) = current_workspace(&app) {
        let state = app.state::<AppState>().inner().clone();
        state.lock().workspace_settings.insert(root, trust);
    }

    let url = match &file {
        Some(p) => {
            let encoded: String = utf8_percent_encode(&p.to_string_lossy(), PATH_ENCODE).collect();
            // The host segment ("localhost") is required by some platforms;
            // the absolute file path begins after it.
            let url_str = format!("htmlartifact://localhost{encoded}?t={token}");
            url::Url::parse(&url_str).map_err(|e| e.to_string())?
        }
        None => url::Url::parse("about:blank").map_err(|e| e.to_string())?,
    };

    if let Some(existing) = app.get_webview(&label) {
        existing.navigate(url).map_err(|e| e.to_string())?;
        return Ok(());
    }

    let main = app
        .get_window("main")
        .ok_or_else(|| "main window not found".to_string())?;

    let position = LogicalPosition::new(0.0, 0.0);
    let size = LogicalSize::new(1.0, 1.0);

    let builder: tauri::webview::WebviewBuilder<Wry> =
        tauri::webview::WebviewBuilder::new(&label, WebviewUrl::External(url))
            .auto_resize()
            .transparent(false);

    main.add_child(builder, position, size)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn update_preview_bounds(
    app: AppHandle,
    label: String,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
) -> Result<(), String> {
    let Some(view) = app.get_webview(&label) else {
        return Ok(());
    };
    let _ = view.set_position(LogicalPosition::new(x as f64, y as f64));
    let _ = view.set_size(LogicalSize::new(
        width.max(1) as f64,
        height.max(1) as f64,
    ));
    Ok(())
}

fn current_workspace(app: &AppHandle) -> Option<PathBuf> {
    let state = app.state::<AppState>().inner().clone();
    let s = state.lock();
    s.workspace_root.clone()
}
