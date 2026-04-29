# Mobile and desktop shells (post–web-parity)

Use this **after** the SPA reaches the [parity gate](../PLAN_PROGRESS.md): native wrappers multiply CI surface area—defer until HTTP, collab, realtime, and account flows are stable on the web build.

**Product constraints (restart plan):** [**no RevenueCat / native IAP**](../../docs/RESTART_PLAN.md); [**Stripe**](../../docs/RESTART_PLAN.md) remains the web billing source of truth. Do not add IAP SDKs or webhook routes for mobile stores in the greenfield stack.

---

## Capacitor vs Tauri (quick choice)

| | **Capacitor** | **Tauri** |
|---|----------------|-----------|
| **Targets** | iOS + Android (+ optional web export patterns) | Desktop first (Windows/macOS/Linux); mobile story is separate |
| **Shell** | WebView loads your built SPA (`dist/`) | WebView + Rust core; smaller binaries on desktop |
| **Fit for DeepNotes** | Primary path for **phones/tablets** once APIs + cookies + WS work in mobile WebViews | Strong default for a **desktop** app alongside the SPA |
| **API base URL** | Configure server URL per build/flavor (staging vs prod); mind **ATS** (iOS) and **cleartext** restrictions | Same env-driven API origin as web; deep links / custom schemes for auth callbacks |

Pick **Capacitor** when you need App Store / Play distribution with minimal native code. Pick **Tauri v2** when the goal is a **desktop** installer with native menus and smaller footprint; treat **mobile** as Capacitor unless you explicitly adopt Tauri’s mobile beta with extra QA.

---

## Environment URLs and cookies

- **HTTP API:** same REST base as web (`VITE_*` or build-time `import.meta.env` mirror)—no `/trpc` compatibility layer required for new shells.
- **WebSockets:** collab (`PageCollabRoom`) and realtime (`UserRealtimeRoom`) URLs must match Worker routes; WebViews must allow **wss:** to your API host (and staging hosts for QA).
- **Cookies:** session cookies are **HTTP-only**; confirm **SameSite** / **Secure** behavior inside embedded WebViews (often ok if API and asset origins are aligned; test login + refresh on device).
- **Stripe:** checkout/portal stay **in-system browser** or **Safari View Controller** patterns—do not embed Stripe hosted pages in opaque WebViews without vendor guidance.

---

## Pre-flight checklist (before adding native projects)

1. Web parity gate items in `PLAN_PROGRESS.md` satisfied for routes you ship in the shell.
2. No **RevenueCat** or other IAP SDKs; billing docs and support scripts assume **Stripe web** only.
3. Staging URLs documented for API + static assets + WS; secrets not baked into the bundle (`wrangler`/CI inject server-side; client gets public URLs only).
4. Decide CI: **doc-only** until shells exist—when you add Capacitor/Tauri, extend Turbo with optional filters so default PRs stay fast.

---

## Adding scaffolding (when ready)

Minimal first step is usually **`npm init @capacitor/app`** (or equivalent) at monorepo root **or** a dedicated `apps/mobile/` package that copies `apps/web` build output—**do not** wire this until web parity and staging smoke ([STAGING_LOADTEST.md](./STAGING_LOADTEST.md)) are satisfied, so CI cost stays predictable.

For Tauri, follow upstream **v2** docs for a sidecar that points `devUrl` / `frontendDist` at `@deepnotes/web` `dist/`.
