# htmlbrowser.dev

A local-first viewer for AI-generated HTML artifacts.

Open a folder. Get instant previews with live reload. No browser tabs. No localhost servers. No clutter.

## Why

Claude Code, Cursor, OpenCode, and other AI workflows constantly generate HTML files — specs, dashboards, reports, prototypes. Browsers aren't built for this. `htmlbrowser.dev` is.

It is **not** a browser replacement. It is a runtime for local artifacts.

## Features (v1)

- Open any local folder as a workspace
- Sidebar file explorer for `.html` / `.htm` files
- Dedicated webview for isolated preview rendering (no iframes)
- Live reload when files change on disk
- Workspace persistence and recent workspaces
- Safe / Trusted modes with strict CSP isolation
- Dark mode

## Stack

- Tauri v2
- React 19 + TypeScript + Vite
- TailwindCSS
- Zustand
- Rust (`notify` for file watching, custom URI scheme protocol for sandboxed file delivery)

## Requirements

- Node 20+
- pnpm
- Rust (stable)
- macOS 11+

## Development

```bash
pnpm install
pnpm tauri dev
```

## Build

```bash
pnpm tauri build
```

## Security model

By default, every workspace opens in **Safe** mode:

- No JavaScript execution
- No outbound network requests
- No remote assets
- Local CSS, images, and fonts allowed

Toggle **Trusted** mode in the top bar to allow JS, network, and remote assets for workspaces you trust.

## License

MIT — see [LICENSE](./LICENSE).
