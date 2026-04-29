# Restart plan — progress (`new-deepnotes`)

**Refs:** [RESTART_PLAN.md](../docs/RESTART_PLAN.md) · [TRPC_REST_MAP.md](./docs/TRPC_REST_MAP.md) (REST + legacy WS parity map).

**Goal:** **Full behavioral parity** with legacy `apps/client` in `new-deepnotes` before cutover. **Exceptions** (explicit in RESTART_PLAN): no tRPC wire, no user/group **rotate-keys**, no **RevenueCat**. MVP = milestone, **not** scope ceiling.

**Last reviewed:** 2026-04-29

---

## Gap to parity (snapshot)

| Area | State |
|------|--------|
| **API / REST** | TRPC_REST_MAP HTTP rows largely done; **collab WS** + **realtime** (legacy msgpackr) **not**. |
| **SPA** | Auth, lists, **`PageEditorView`** (Tiptap+Y+collab REST), groups/**members**/invite/join, notifications **metadata** only, theme (VueUse **`useColorMode`**, persist / system / toggle). Missing: live collab, account/billing/pages ops/group prefs UIs, notification decrypt, native shells. Editor ≠ legacy infinite canvas/note tree until product-aligned. |

**Deferred (confirm vs parity):** optional anon `GET …/groups/:id/pages`; richer Stripe webhook tests. **Infra naming:** Workers/DO replaces standalone collab/realtime/scheduler processes.

---

## Phases

| # | Status | Blocking work toward parity |
|---|--------|----------------------------|
| **0** | Done | Map, OpenAPI, Drizzle baseline, CLIENT_FORKS |
| **1** | Skip? | Legacy monorepo only |
| **2** | Done | Turbo/CI/template DB/deploy docs |
| **3** | WIP | **Collab WS** + **realtime**; integration tests; [RESTART_PLAN §4.3](../docs/RESTART_PLAN.md) |
| **4** | WIP | See checklist below |
| **5** | Todo | Cutover after **parity gate** + metrics + decrypt spot-checks |

---

## Phase 4 — client checklist

**Required for parity** unless *Deferred* above.

**Done:** typed client, `useSession`, register/login/demo/logout+2FA, home+pages, `PageEditorView`, groups+members+invite/join+crypto, notifications shell, MSW+Vitest session matrix, ESLint restricted imports, Playwright **demo**, `apps/marketing`, theme (VueUse + header switcher).

**Open:**

- [ ] Password (registered) Playwright + stronger session/crypto asserts  
- [ ] Live editing: **collab WS** client + Phase 3 server path  
- [ ] `[parity]` Account / billing / 2FA / email / delete — UIs wired to REST ([TRPC_REST_MAP](./docs/TRPC_REST_MAP.md))  
- [ ] `[parity]` Page ops + group settings + prefs (recents/favorites/path…) — UIs  
- [ ] `[parity]` Editor UX vs legacy (rich + spatial/world if in scope)  
- [ ] `[parity]` Notifications: decrypt/display as legacy  
- [ ] Legacy **realtime** equivalent (after protocol choice)  
- [ ] Capacitor/Tauri **after web parity**

**E2E:** `apps/web/e2e/session.spec.ts` · `pnpm test:e2e` — needs migrated DB + `e2e/dev.vars.ci` → `apps/api-worker/.dev.vars` (see CI + [docs/DEPLOY_CLOUDFLARE.md](./docs/DEPLOY_CLOUDFLARE.md)).

---

## Tests (where to run)

| Package | Command / note |
|---------|----------------|
| `@deepnotes/session` | `pnpm --filter @deepnotes/session exec vitest run src/account-flows.integration.test.ts` (+ `.env` DB URLs) |
| `@deepnotes/web` | `pnpm --filter @deepnotes/web test` (Vitest) |
| `@deepnotes/api-worker` | 503 matrix env-smoke in `index.test.ts` |
| Root E2E | `pnpm test:e2e` |

**Follow-ups:** Redis failed-login IT; refresh expiry; optional OpenAPI snapshot CI.

---

## RESTART_PLAN §8 — still open here

**Already met:** OpenAPI + typed client; no tRPC/superjson/RevenueCat/key-rotation ([CLIENT_FORKS](./docs/CLIENT_FORKS.md)); Drizzle + template Postgres IT ([DRIZZLE_MIGRATIONS](./docs/DRIZZLE_MIGRATIONS.md)); web Vitest CI + import restrictions.

**Open:**

- [ ] Collab **and** realtime: ≥1 integration test each (stack TBD)  
- [ ] Stripe / high-risk: deeper tests when secrets allow  
- [ ] Staging CF: Hyperdrive + Postgres + Redis + WS topology load-tested  
- [ ] E2E beyond demo (password path)  
- [ ] **UI parity** in `@deepnotes/web` (goal above)

---

## Log (recent)

| Date | Note |
|------|------|
| 2026-04-29 | Theme: **`@vueuse/core` `useColorMode`**, hydrate pre-mount, **`ThemeSwitcher`**, Vitest hydration/migration tests, `App` unified shell (`data-testid="app-shell"`). |
| 2026-04-29 | Compacted doc; parity goal + checklist preserved; condensed tests/E2E. |
| 2026-04-29 | Full parity as product gate; `[full parity]` rows + Phase 5 parity gate. |
| 2026-04-27 | TRPC_REST_MAP verified; realtime vs collab WS called out; counts corrected. |

Add a row when phase boundaries shift (collab WS, realtime MVP, cutover).

