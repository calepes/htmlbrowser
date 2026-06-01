# Changelog

## 2026-06-01

### Theme & Viewing Mode

- **Feature**: Dark/light theme toggle en la topbar (ícono sol/luna) — persiste entre sesiones via localStorage, con flash prevention en `index.html`
- **Feature**: Mobile/web view toggle — modo mobile centra el preview a 393px (iPhone 15) con fondo lateral y marco sutil; modo web mantiene el comportamiento original
- **Fix**: Sidebar ahora responde al tema de la app (bg explícito `bg-bg-subtle`) en lugar del vibrancy nativo de macOS, que seguía el tema del sistema independientemente de la app
- **Feature**: Al cambiar tema, el preview HTML también cambia su `prefers-color-scheme` via `NSAppearance` nativo (comando Rust `set_preview_color_scheme` con objc2)
- **Fix**: Colores hardcodeados `white/5`, `white/10` en topbar y sidebar migrados a variables CSS semánticas para soporte de tema light

### Docs

- **Docs**: `CLAUDE.md` creado con contexto de setup, comandos, arquitectura del preview y gotchas de build
