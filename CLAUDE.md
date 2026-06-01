# HTML Browser — Claude Context

## Repositorio
Fork/sync de https://github.com/calepes/htmlbrowser (repo original: maail/htmlbrowser.dev)
Git remoto: `git@github.com:calepes/htmlbrowser.git`

## Stack
Tauri 2.x + React + TypeScript + Tailwind. Rust backend en `src-tauri/src/`.
Frontend en `src/`: `components/` (UI), `store/` (Zustand), `hooks/`, `lib/tauri.ts` (invoke wrappers).

## Setup (primera vez)
- `npm install -g pnpm` — pnpm no viene instalado globalmente
- `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y` — Rust/Cargo
- `source ~/.cargo/env` — activar Cargo en la sesión actual
- `pnpm install` — instalar dependencias JS

## Comandos
- Dev: `source ~/.cargo/env && pnpm tauri dev`
- Build: `source ~/.cargo/env && APPLE_SIGNING_IDENTITY="-" pnpm tauri build`
- Primera compilación Rust: ~10-15 min. Las siguientes: ~2-3 min.
- Typecheck JS: `node_modules/.bin/tsc --noEmit`
- Typecheck Rust: `source ~/.cargo/env && cargo check` (desde `src-tauri/`)

## Build — gotchas
- El error final `TAURI_SIGNING_PRIVATE_KEY not set` es esperado (updater del repo original). Los bundles `.app` y `.dmg` se crean correctamente antes de ese error.
- Output: `src-tauri/target/release/bundle/macos/HTML Browser.app` y `bundle/dmg/*.dmg`
- `pnpm-workspace.yaml` debe tener `allowBuilds: esbuild: true`

## Arquitectura del preview
- El preview HTML es un webview nativo de Tauri (label `"preview"`), no un iframe.
- Se posiciona via `invoke("update_preview_bounds", ...)` usando `getBoundingClientRect()` del div contenedor.
- Para cambiar `prefers-color-scheme` en el preview: usar `invoke("set_preview_color_scheme", { label: "preview", scheme })` — hace `setAppearance` via `objc2` en el WKWebView nativo.
- `with_webview` requiere feature `"unstable"` en Tauri (ya habilitada en Cargo.toml).

## Tema (light/dark)
- Estado en `src/store/settings.ts`, persistido en localStorage.
- Variables CSS en `src/index.css`: `:root` = dark, `html.light` = light.
- Flash prevention: script inline en `index.html` antes de React.
- Sidebar usa `bg-bg-subtle` explícito (no vibrancy) para que responda al tema de la app independiente del sistema macOS.

## objc2 (macOS native)
- Ya en Cargo.toml bajo `[target.'cfg(target_os = "macos")'.dependencies]`
- Usar `AnyClass::get(CStr::from_bytes_with_nul_unchecked(b"NSClassName\0"))` para obtener clases ObjC.
- `wv.inner()` en el closure de `with_webview` retorna el puntero al WKWebView — castear a `*const AnyObject`.
