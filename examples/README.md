# Smoke-test fixtures

Open this folder as a workspace to verify each rendering path.

## What each file tests

| File | Tests | Safe mode | Trusted mode |
|---|---|---|---|
| `01-static.html` | Pure HTML + inline CSS | ✅ Renders | ✅ Renders |
| `02-css-animation.html` | CSS keyframes, no JS | ✅ Animates | ✅ Animates |
| `03-svg-illustration.html` | Inline SVG, gradients, text | ✅ Renders | ✅ Renders |
| `04-js-counter.html` | `<script>` + `addEventListener` | ⚠️  Banner shown, count stuck at 0 | ✅ Buttons work |
| `05-js-rendered-list.html` | DOM built from JS array | ⚠️  Banner shown, fallback message visible | ✅ 12 cards render |
| `06-inline-handlers.html` | `onclick=""` attributes | ⚠️  Banner shown, clicks no-op | ✅ Click writes timestamp |
| `07-external-cdn.html` | Google Fonts + Tailwind CDN | ❌ System font, unstyled | ✅ Inter + Tailwind classes apply |
| `08-canvas-animation.html` | Canvas + requestAnimationFrame | ⚠️  Banner shown, blank canvas | ✅ 80 green dots animating |
| `nested/deep-spec.html` | Sidebar tree expansion | ✅ Renders | ✅ Renders |

## What "the JS banner" indicates

When Safe mode is on and the inspector finds `<script>` tags or inline event handlers, the preview shows an amber banner with a one-click switch to Trusted. Files 4–6 and 8 should trigger it; 1–3 should not. File 7 is borderline — it uses external resources but no scripts run client-side meaningfully without them; the banner currently triggers because it has a `<script src=...>` tag.
