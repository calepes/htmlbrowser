# Showcase fixtures

Polished, hero-clip-ready HTML files. All pure HTML + inline CSS + inline SVG — no JavaScript, no CDN dependencies, render identically in Safe and Trusted modes.

| File | Why it's useful for the demo |
|---|---|
| `sales-dashboard.html` | KPI cards, sparklines, an SVG line chart, top-products list, regional bars. Reads as a real Q3 dashboard at a glance — perfect for the side-by-side hero loop where Claude generates a dashboard and the preview renders it. |
| `auth-flow-spec.html` | Spec doc with an inline SVG flow diagram. Matches the visual on the landing page hero. Good for showing "specs and architecture" use case. |
| `handoff-notes.html` | Engineering handoff doc with status cards, checklist, risk levels, owner avatars. Sells the "AI-generated work documents" angle. |

## Suggested 8-12s hero loop

1. (00:00) Cursor / Claude Code on the left typing: *"build me a Q3 sales dashboard"*
2. (00:03) `sales-dashboard.html` materializes in the htmlbrowser.dev sidebar with the **● LIVE** dot pulsing
3. (00:04) Click → renders instantly
4. (00:07) Type: *"make the chart green"*
5. (00:09) **Preview updates without a click** — the file watcher catches the disk write
6. End frame on the polished dashboard
7. Loop

For a 3-second teaser GIF/loop suitable for tweeting:

1. Show `sales-dashboard.html` rendered in htmlbrowser.dev
2. Edit the file in the background (swap one number, change the accent color)
3. Watch the preview update without interaction

## Tools

- Recording: [Screen Studio](https://screen.studio) (auto-zoom, polished cuts)
- Export: MP4 H.264 for the landing-page hero, with a poster image fallback
