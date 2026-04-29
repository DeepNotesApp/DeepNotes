# Restart plan — progress (`new-deepnotes`)

**Refs:** [RESTART_PLAN.md](../docs/RESTART_PLAN.md) · [TRPC_REST_MAP.md](./docs/TRPC_REST_MAP.md) (REST + legacy WS parity map).

**Goal:** **Full behavioral parity** with legacy `apps/client` in `new-deepnotes` before cutover. **Exceptions** (explicit in RESTART_PLAN): no tRPC wire, no user/group **rotate-keys**, no **RevenueCat**. MVP = milestone, **not** scope ceiling.

**Last reviewed:** 2026-04-29

---

## Gap to parity (snapshot)

| Area | State |
|------|--------|
| **API / REST** | TRPC_REST_MAP HTTP rows largely done; **collab WS** MVP (**Durable Object** relay + Postgres append, legacy lib0 framing via `@deepnotes/collab-wire`); **realtime** (legacy msgpackr) **not**. |
| **SPA** | Auth, lists, **`PageEditorView`** (Tiptap+Y+collab **WebSocket when configured** else REST, **encrypted awareness + collaboration carets** on WS, link/underline/placeholder, path breadcrumb, bump/favorite/recent, **snapshots list/save/restore/delete**, **set-as-main + soft-delete + purge**, **cross-group move/reencrypt**), groups/**members**/invite/join + **group settings** (join policy, soft-delete, **make public / make private**, **group purge**), notifications list **with decrypt**, **`/account`**, home **recents/favorites/starting/defaults** UIs, theme. Missing: **realtime** (hash channel), tables/math/images/spatial editor depth, native shells. |

**Deferred (confirm vs parity):** optional anon `GET …/groups/:id/pages`; richer Stripe webhook tests. **Infra naming:** Workers/DO replaces standalone collab/realtime/scheduler processes.

---

## Phases

| # | Status | Blocking work toward parity |
|---|--------|----------------------------|
| **0** | Done | Map, OpenAPI, Drizzle baseline, CLIENT_FORKS |
| **1** | Skip? | Legacy monorepo only |
| **2** | Done | Turbo/CI/template DB/deploy docs |
| **3** | WIP | **realtime** (msgpackr); collab WS MVP **done** (integration tests vs DO later) |
| **4** | WIP | See checklist below |
| **5** | Todo | Cutover after **parity gate** + metrics + decrypt spot-checks |

---

## Phase 4 — client checklist

**Required for parity** unless *Deferred* above.

**Done:** typed client, `useSession`, register/login/demo/logout+2FA, home+pages (starting/recent/favorites/defaults), `PageEditorView` (path, bump, favorite, recent), groups+members+invite/join+crypto + **group settings** (join requests, soft-delete), notifications list + decrypt, **`AccountView`**, MSW+Vitest session matrix, ESLint restricted imports, `apps/marketing`, theme (VueUse + header switcher).

**Open:**

- [x] Stronger Vitest (or integration) coverage for password path + session/crypto asserts (`apps/web/src/features/auth/session-keyrings.test.ts`)
- [x] Live editing: **collab WS** client + **Durable Object** + internal Postgres append (greenfield; legacy-framed **DOC** relay + optional **AWARENESS** relay; **no** key rotation / Redis merge)  
- [x] `[parity]` Account / billing / 2FA / email / delete — UIs wired to REST ([TRPC_REST_MAP](./docs/TRPC_REST_MAP.md))  
- [x] `[parity]` Page ops + group settings — **make private** + cross-group **move/reencrypt** + **purge** UI (page + group); **make public**, snapshots + main + soft-delete **done** in SPA  
- [ ] `[parity]` Editor UX vs legacy (rich + spatial/world if in scope) — **partial:** WS awareness+carets, link/underline/placeholder (not tables/math/images/world)  
- [x] `[parity]` Notifications: decrypt/display as legacy  
- [ ] Legacy **realtime** equivalent (after protocol choice)  
- [ ] Capacitor/Tauri **after web parity**

---

## Tests (where to run)

| Package | Command / note |
|---------|----------------|
| `@deepnotes/session` | `pnpm --filter @deepnotes/session exec vitest run src/account-flows.integration.test.ts` (+ `.env` DB URLs) |
| `@deepnotes/web` | `pnpm --filter @deepnotes/web test` (Vitest) |
| `@deepnotes/api-worker` | 503 matrix env-smoke in `index.test.ts` |

**Follow-ups:** Redis failed-login IT; refresh expiry; optional OpenAPI snapshot CI.

---

## RESTART_PLAN §8 — still open here

**Already met:** OpenAPI + typed client; no tRPC/superjson/RevenueCat/key-rotation ([CLIENT_FORKS](./docs/CLIENT_FORKS.md)); Drizzle + template Postgres IT ([DRIZZLE_MIGRATIONS](./docs/DRIZZLE_MIGRATIONS.md)); web Vitest CI + import restrictions.

**Open:**

- [ ] Collab **and** realtime: ≥1 integration test each — `collab-wire` **decodeIncoming** unit coverage; full DO path **TBD** in CI  
- [ ] Stripe / high-risk: deeper tests when secrets allow  
- [ ] Staging CF: Hyperdrive + Postgres + Redis + WS topology load-tested  
- [ ] **UI parity** in `@deepnotes/web` (account + notification decrypt + page prefs/home/editor + group join/delete done; collab WS + realtime + deeper editor still open — goal above)

---

## Log (recent)

| Date | Note |
|------|------|
| 2026-04-29 | **Editor collab parity:** `PageAwarenessUpdate` E2EE over WS, `@tiptap/extension-collaboration-caret` + `y-protocols`, link/underline/placeholder; `decodeIncomingCollabBinaryMessage` in `@deepnotes/collab-wire`. |
| 2026-04-29 | **Collab WebSocket:** `@deepnotes/collab-wire` (lib0), `PageCollabRoom` DO + `WORKER_SELF` internal append, SPA `PageEditorView` WS + REST fallback; `COLLAB_INTERNAL_SECRET`; Vite `ws` proxy. |
| 2026-04-29 | **Make-private bootstrap + SPA**, **collab GET titles**, **group collab context**, **cross-group move/reencrypt**, **page + group purge** UI; `byteB64EmptyOk` for empty group name on make-private POST. |
| 2026-04-29 | **Page prefs + group settings UI:** `GET …/pages/recent|favorites`, home (starting/recent/favorites/spatial defaults), editor path + bump/favorite/recent; group join-policy + soft-delete. |
| 2026-04-29 | **`AccountView`** (`/account`): Stripe checkout/portal, password + email verify/change/confirm + raw keyrings, 2FA (enable/load/recovery/disable/devices), delete account; **`extractRawUserKeyringsBase64FromSession`** + **`build-password-and-email-confirm`**; notifications **msgpack decrypt** (`UserNotificationContent`); header link. |
| 2026-04-29 | Theme: **`@vueuse/core` `useColorMode`**, hydrate pre-mount, **`ThemeSwitcher`**, Vitest hydration/migration tests, `App` unified shell (`data-testid="app-shell"`). |
| 2026-04-29 | Compacted doc; parity goal + checklist preserved; condensed tests. |
| 2026-04-29 | Full parity as product gate; `[full parity]` rows + Phase 5 parity gate. |
| 2026-04-27 | TRPC_REST_MAP verified; realtime vs collab WS called out; counts corrected. |

Add a row when phase boundaries shift (collab WS, realtime MVP, cutover).

