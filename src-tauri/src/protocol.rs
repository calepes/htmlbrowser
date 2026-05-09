use std::borrow::Cow;
use std::path::{Path, PathBuf};

use percent_encoding::percent_decode_str;
use tauri::http::{header, Request, Response, StatusCode};
use tauri::{Manager, UriSchemeContext};

use crate::paths::{canonicalize_or, extension_lower, is_within};
use crate::state::{AppState, TrustMode};

pub const SCHEME: &str = "htmlartifact";

const SAFE_CSP: &str = "default-src 'self' htmlartifact:; \
    img-src 'self' data: htmlartifact:; \
    style-src 'self' 'unsafe-inline' htmlartifact:; \
    font-src 'self' data: htmlartifact:; \
    media-src 'self' data: htmlartifact:; \
    script-src 'none'; \
    connect-src 'none'; \
    object-src 'none'; \
    frame-src 'none'; \
    base-uri 'none'; \
    form-action 'none'";

const TRUSTED_CSP: &str = "default-src * 'unsafe-inline' 'unsafe-eval' data: blob: htmlartifact:; \
    img-src * data: blob: htmlartifact:; \
    media-src * data: blob: htmlartifact:; \
    connect-src *; \
    script-src * 'unsafe-inline' 'unsafe-eval' htmlartifact:; \
    style-src * 'unsafe-inline' htmlartifact:";

pub fn handle<R: tauri::Runtime>(
    ctx: UriSchemeContext<'_, R>,
    request: Request<Vec<u8>>,
) -> Response<Cow<'static, [u8]>> {
    let app = ctx.app_handle();
    let state = app.state::<AppState>().inner().clone();

    let (workspace, trust) = {
        let s = state.lock();
        let ws = s.workspace_root.clone();
        let trust = ws
            .as_ref()
            .and_then(|root| s.workspace_settings.get(root).copied())
            .unwrap_or(TrustMode::Safe);
        (ws, trust)
    };

    let Some(workspace) = workspace else {
        return error_response(StatusCode::NOT_FOUND, "no workspace open");
    };

    let path = match decode_path(request.uri().to_string().as_str()) {
        Some(p) => p,
        None => return error_response(StatusCode::BAD_REQUEST, "invalid URL"),
    };

    let canonical = canonicalize_or(&path);
    if !is_within(&workspace, &canonical) {
        return error_response(StatusCode::FORBIDDEN, "path outside workspace");
    }

    let bytes = match std::fs::read(&canonical) {
        Ok(b) => b,
        Err(_) => return error_response(StatusCode::NOT_FOUND, "file not found"),
    };

    let mime = mime_for(&canonical);
    let csp = match trust {
        TrustMode::Safe => SAFE_CSP,
        TrustMode::Trusted => TRUSTED_CSP,
    };

    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, mime)
        .header("Content-Security-Policy", csp)
        .header(header::CACHE_CONTROL, "no-store")
        .body(Cow::Owned(bytes))
        .unwrap_or_else(|_| error_response(StatusCode::INTERNAL_SERVER_ERROR, "build failure"))
}

fn decode_path(uri: &str) -> Option<PathBuf> {
    // Strip the scheme.
    let after_scheme = uri.strip_prefix(&format!("{SCHEME}://"))?;
    // Drop the (host) prefix if present, e.g. "localhost/...".
    let path_part = after_scheme
        .splitn(2, '/')
        .nth(1)
        .map(|s| format!("/{s}"))
        .unwrap_or_else(|| after_scheme.to_string());
    // Strip any query or fragment.
    let path_only = path_part
        .split_once('?')
        .map(|(p, _)| p)
        .unwrap_or(&path_part)
        .split_once('#')
        .map(|(p, _)| p)
        .unwrap_or_else(|| {
            path_part
                .split_once('?')
                .map(|(p, _)| p)
                .unwrap_or(&path_part)
        });
    let decoded = percent_decode_str(path_only).decode_utf8_lossy();
    Some(PathBuf::from(decoded.into_owned()))
}

fn mime_for(path: &Path) -> &'static str {
    match extension_lower(path).as_str() {
        "html" | "htm" => "text/html; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "js" | "mjs" => "application/javascript; charset=utf-8",
        "json" => "application/json; charset=utf-8",
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "avif" => "image/avif",
        "ico" => "image/x-icon",
        "woff" => "font/woff",
        "woff2" => "font/woff2",
        "ttf" => "font/ttf",
        "otf" => "font/otf",
        "txt" | "md" => "text/plain; charset=utf-8",
        _ => "application/octet-stream",
    }
}

fn error_response(status: StatusCode, msg: &'static str) -> Response<Cow<'static, [u8]>> {
    Response::builder()
        .status(status)
        .header(header::CONTENT_TYPE, "text/plain; charset=utf-8")
        .body(Cow::Borrowed(msg.as_bytes()))
        .unwrap()
}
