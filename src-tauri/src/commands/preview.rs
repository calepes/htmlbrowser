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

#[tauri::command]
pub async fn set_preview_color_scheme(
    app: AppHandle,
    label: String,
    scheme: String,
) -> Result<(), String> {
    let Some(view) = app.get_webview(&label) else {
        return Ok(());
    };

    #[cfg(target_os = "macos")]
    {
        let is_dark = scheme == "dark";
        view.with_webview(move |wv| {
            use objc2::runtime::AnyObject;
            use objc2::msg_send;

            unsafe {
                let ns_string_cls = objc2::runtime::AnyClass::get(
                    std::ffi::CStr::from_bytes_with_nul_unchecked(b"NSString\0"),
                )
                .unwrap();
                let ns_appearance_cls = objc2::runtime::AnyClass::get(
                    std::ffi::CStr::from_bytes_with_nul_unchecked(b"NSAppearance\0"),
                )
                .unwrap();

                let name_ptr: *const i8 = if is_dark {
                    b"NSAppearanceNameDarkAqua\0".as_ptr().cast()
                } else {
                    b"NSAppearanceNameAqua\0".as_ptr().cast()
                };

                let ns_name: *mut AnyObject =
                    msg_send![ns_string_cls, stringWithUTF8String: name_ptr];
                let appearance: *mut AnyObject =
                    msg_send![ns_appearance_cls, appearanceNamed: ns_name];
                let webview = &*(wv.inner() as *const AnyObject);
                let _: () = msg_send![webview, setAppearance: appearance];
            }
        })
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

fn current_workspace(app: &AppHandle) -> Option<PathBuf> {
    let state = app.state::<AppState>().inner().clone();
    let s = state.lock();
    s.workspace_root.clone()
}
