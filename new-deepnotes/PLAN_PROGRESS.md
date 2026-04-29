# Restart plan — progress (`new-deepnotes`)

**Refs:** [RESTART_PLAN.md](../docs/RESTART_PLAN.md) · [TRPC_REST_MAP.md](./docs/TRPC_REST_MAP.md) (REST + legacy WS parity map).

**Goal:** **Full behavioral parity** with legacy `apps/client` in `new-deepnotes` before cutover. **Exceptions** (explicit in RESTART_PLAN): no tRPC wire, no user/group **rotate-keys**, no **RevenueCat**. MVP = milestone, **not** scope ceiling.

**Last reviewed:** 2026-04-29

---

## Gap to parity (snapshot)

| Area | State |
|------|--------|
| **API / REST** | TRPC_REST_MAP HTTP rows largely done; **collab WS** MVP (**Durable Object** relay + Postgres append, legacy lib0 framing via `@deepnotes/collab-wire`); **realtime** **`GET /api/realtime-ws`** + **`UserRealtimeRoom` DO** + `@deepnotes/realtime-wire`. Framing + Vitest round-trips; **`USER_NOTIFICATION`** push after `performNotifyUsers`. **Hash slice:** when **Upstash** is configured (`UPSTASH_REDIS_*`), DO handles legacy **REQUEST** batches for **`user:{userId}`** Redis (**HGET**/**HSET**/**SUBSCRIBE**/**UNSUBSCRIBE** → **RESPONSE** + **DATA_NOTIFICATION** intra-DO fan-out). **Still open:** **`page`** / **`group`** hash ACL vs Postgres (legacy DataAbstraction); cross-process Redis pub/sub (legacy `expiremember`/KeyDB) not replicated. SPA remains REST-heavy for titles until client opts into hash WS. |
| **SPA** | Auth, lists, **`PageEditorView`** (Tiptap+Y+collab **WebSocket when configured** else REST, **encrypted awareness + collaboration carets** on WS, link/underline/placeholder, **tables, images, tasks, code (lowlight), KaTeX math (inline + block), YouTube embeds (Vue node view + resize handle like legacy)**, highlight, align, sub/sup, HR, path breadcrumb, bump/favorite/recent, **snapshots list/save/restore/delete**, **set-as-main + soft-delete + purge**, **cross-group move/reencrypt**), groups/**members**/invite/join + **group settings** (join policy, soft-delete, **make public / make private**, **group purge**), notifications list **with decrypt**, **`/account`**, home **recents/favorites/starting/defaults** UIs, theme, **live notification toast** when **`/api/realtime-ws`** connected. Missing: **`page`/`group` realtime hashes + SPA wired** (full legacy parity; worker has **`user:{id}`** hash slice when Upstash is set); **spatial/world** canvas, native shells. |

**Deferred (confirm vs parity):** optional anon `GET …/groups/:id/pages`; richer Stripe webhook tests. **Infra naming:** Workers/DO replaces standalone collab/realtime/scheduler processes.

---

## Phases

| # | Status | Blocking work toward parity |
|---|--------|----------------------------|
| **0** | Done | Map, OpenAPI, Drizzle baseline, CLIENT_FORKS |
| **1** | Skip? | Legacy monorepo only |
| **2** | Done | Turbo/CI/template DB/deploy docs |
| **3** | WIP | **realtime:** `USER_NOTIFICATION` WS + DO + invite **`notifyUsers`**; **`user`-hash** REQUEST (**Upstash**) + RESP/DATA_NOTIFICATION in-DO (**`page`/`group` ACL + cross-node pub/sub** still open); collab WS MVP **done** |
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
- [ ] `[parity]` Editor UX vs legacy (rich + spatial/world if in scope) — **partial:** WS awareness+carets; TipTap **tables, images, tasks**, **code (lowlight), math (inline + block), YouTube** (Vue node view + resize handle), typography (highlight, align, sub/sup, HR), link/underline/placeholder (**no** spatial/world canvas yet)  
- [x] `[parity]` Notifications: decrypt/display as legacy  
- [x] Legacy **realtime** — **partial:** `USER_NOTIFICATION` over **`/api/realtime-ws`** + per-user DO (`@deepnotes/realtime-wire`); join-invite **DB notifications** + E2EE payloads; **`user:{id}`** hash **REQUEST**/RESP (**Upstash** optional); **`page`/`group`** caches + Redis pub/sub parity **not** done  
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

- [ ] Collab **and** realtime: ≥1 integration test each — `collab-wire` **decodeIncoming** unit coverage; **realtime-wire** framing Vitest round-trips; **api-worker** `executeRealtimeWsBatch` (**user** hash) Vitest — full DO + Redis in CI **TBD**  
- [ ] Stripe / high-risk: deeper tests when secrets allow  
- [ ] Staging CF: Hyperdrive + Postgres + Redis + WS topology load-tested  
- [ ] **UI parity** in `@deepnotes/web` (account + notification decrypt + page prefs/home/editor + group join/delete + rich TipTap **done**; **realtime hash cache** + **spatial/world** still open — goal above)

---

## Log (recent)

| Date | Note |
|------|------|
| 2026-04-29 | **Realtime Redis hash slice (Upstash):** `UserRealtimeRoom` handles binary **REQUEST** (`executeRealtimeWsBatch`); **`user:{userId}`** HGET/HSET/SUBSCRIBE/UNSUBSCRIBE + subscriber fan-out; **`realtime-ws-batch.test.ts`**. |
| 2026-04-29 | **Realtime wire framing parity:** `@deepnotes/realtime-wire` decodes/encodes legacy **RESPONSE**, **DATA_NOTIFICATION**, and client **REQUEST** batches (msgpackr + lib0) with Vitest; Worker DO unchanged (`USER_NOTIFICATION` only). Moves toward Redis hash cache parity without E2E. |
| 2026-04-29 | **Realtime `USER_NOTIFICATION` parity slice:** `@deepnotes/realtime-wire`, `UserRealtimeRoom` DO, `GET /api/realtime-ws`, `performNotifyUsers` + join-invite optional `notifications` + bootstrap `?inviteeUserId=` keyrings; SPA toast + `buildGroupInviteSentNotifications`. |
| 2026-04-29 | **TipTap deep parity:** code blocks (**lowlight** + atom-one-dark CSS), **YouTube** embeds, **KaTeX** inline + block math (Vue node views, legacy `inline-math` / `math-block` HTML tags); direct **`@tiptap/core` + `@tiptap/pm`** deps to avoid parent-monorepo TipTap v2 resolution. |
| 2026-04-29 | **TipTap parity slice:** tables (resizable), images (inline + base64), task lists, highlight, text align, sub/sup, horizontal rule; scoped editor CSS + Vitest on extension bundle. |
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

