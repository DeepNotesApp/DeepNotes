# DeepNotes — Restart (greenfield) plan

This document is a **technical and delivery plan** for recreating DeepNotes in a new codebase while **preserving user data and crypto semantics** and planning a **coordinated cutover**; it does **not** promise wire compatibility with the legacy **tRPC** or **KeyDB** stack (see *Decided stack* below). It complements the product and architecture summaries in [NON_TECHNICAL_OVERVIEW.md](./NON_TECHNICAL_OVERVIEW.md) and [TECHNICAL_OVERVIEW.md](./TECHNICAL_OVERVIEW.md), and reflects a thorough read of the current monorepo layout, API boundaries, and operational patterns.

**Audience:** engineers and technical leads who will scope work, own compatibility, and sequence migration.

**Non-goals here:** detailed UI redesign, pricing, or product roadmap—only what is required to **restart the implementation safely**.

---

## Decided stack and product choices (this restart)

The following are **set decisions** for the new implementation (they override earlier “strawman” text elsewhere in this doc where they conflict).

| Area | Choice |
|------|--------|
| **HTTP API** | **No tRPC.** Use a conventional **HTTP API** (e.g. **REST** under `/api/...` or a small set of versioned resource routes) with **request/response schemas** in code (**Zod** or **Valibot**) and a published **OpenAPI** spec. The client uses plain `fetch` or a thin typed client generated from that spec. |
| **ORM / SQL** | **Drizzle** for **schema, migrations, and queries** in the new project—replacing **Knex + Objection** from the current codebase. |
| **Cache / sessions** | **Redis** (standard **open-source Redis** or a managed **Redis**-compatible service). **Not KeyDB** as a hard dependency. |
| **Key rotation** | **Removed** from the product and codebase to reduce complexity. No user/group “rotate keys” WebSocket flows; no **scheduled page key re-encryption** in **collab** (`next_key_rotation_date` and related logic in the current app are dropped, not reimplemented). Existing ciphertext in Postgres that was encrypted with the **current** keys **remains valid**; you simply stop the rotation machinery. Revisit only if a future security incident **requires** forced re-keying. |
| **Mobile / IAP billing** | **RevenueCat** is **out of scope** for the new stack (no webhook, no client integration). **Stripe** remains the web subscription source of truth where billing applies. |
| **Legacy wire compatibility** | The **tRPC** (`/trpc/...`) wire protocol and **`superjson`**-shaped payloads are **not** a compatibility target. **Backward compatibility** for this plan means **data** (Postgres + decryptable page blobs with existing keys) and, where you choose to keep them, **WebSocket** protocols for **realtime** and **collab**—**not** HTTP API parity with the old app. Migration = **one coordinated cutover** to the new client and API (or a **temporary** legacy API gateway, which you are **not** committing to by default). |

**Redis vs KeyDB caveat:** the current `DataAbstraction` layer in `@stdlib/data` defines Redis commands such as **`expiremember`**, which is a **KeyDB / Redis Stack–style** extension, not part of standard Redis. A migration to “normal Redis” must **reimplement** TTL and cache invalidation using **standard** commands (e.g. per-key `EXPIRE`, key naming, or hashes without field-level `EXPIRE` unless you accept `HEXPIRE` only on **Redis 8+** or similar—decide in implementation).

---

## 1. What “restart” should mean

| Goal | Meaning in practice |
|------|---------------------|
| **New project** | A separate repository or clearly isolated worktree, with a modern default toolchain (lockfile, Node LTS, CI) chosen deliberately—not inherited from 2022-era constraints. |
| **Backward compatible (data + crypto)** | **PostgreSQL** data that existing users rely on: rows and **bytea** blobs remain **readable** after the migration, using the same client-side and server-stored key material as today, **without** the old **tRPC** HTTP contract. **Cookie + JWT** patterns can stay familiar to users, but the **JSON bodies and paths** of the new HTTP API are new. **Realtime** and **collab** WebSocket **binary protocols** are optional compatibility targets: simplest path is a **new client** written against **documented** protocols, whether or not they are byte-for-byte identical to the old server. |
| **Better maintenance** | Clear module boundaries, **OpenAPI** as the contract, **Drizzle** migrations, test coverage where risk is high (auth, crypto, payments, data transitions), and faster dev feedback (no default `tsx --inspect-brk` in hot paths, modern bundler, smaller “forked dependency” surface). |

**License and obligations:** the project is **AGPL-3.0** (`LICENSE`); a restart does not change copyleft or deployment obligations. Keep compliance visible in the new repo.

---

## 2. Current architecture (as-is), condensed

The existing stack is already described accurately in [TECHNICAL_OVERVIEW.md](./TECHNICAL_OVERVIEW.md). These points matter most for a restart:

- **Monorepo:** pnpm workspaces + **Turbo**; TypeScript project references build **server apps and shared `packages/*`**, while the **Quasar client** is compiled by Vite/Quasar (not the root `tsc` graph for the SPA code).
- **Client (`@deepnotes/client`):** **Vue 3.2** + **forked Quasar** (`@deepnotes/quasar`, `@deepnotes/quasar-app-vite`), **Vite ~2.9**, **Pinia**, **Tiptap** + **Yjs** + **SyncedStore**; depends on **workspace** `@deepnotes/app-server` for the **tRPC `AppRouter`** type.
- **App server (legacy):** **Fastify** + **tRPC v10** on `/trpc` + **separate WebSocket** handlers under `src/websocket/` (group invites, page moves, password/email, **key rotation**—dropped in the new stack, etc.); **Stripe** + (legacy) **RevenueCat** webhooks; **Objection** + **Knex** + **Postgres**; **KeyDB** via **`DataAbstraction`** in `@stdlib/data` (large, cross-cutting).
- **Other services:** `realtime-server` (msgpackr-style **live** protocol), `collab-server` (**Yjs**-aligned binary protocol, path e.g. `COLLAB_SERVER_URL/page:{pageId}` on the client), `scheduler`, `manager` CLI.
- **Schema management:** `postgres-init.sql` is a **full dump-style** artifact; there is **no in-repo chain of versioned SQL migrations** (a major operational and compatibility risk for any “new project” that must coexist with production).

---

## 3. Pain points this exploration validated (or clarified)

### 3.1 Tight coupling (in the legacy app)

- **Type coupling:** the client imports `@deepnotes/app-server` to share **`AppRouter`**, wiring UI code to the entire server package graph. The new stack **replaces** that with **OpenAPI-generated** (or Zod-shared) client types.
- **Data layer:** `DataAbstraction` centralizes **Redis + pub/sub + in-process LRU** and domain-specific hashes; it is powerful but **hard to replace incrementally** and scatters “truth” about cache key semantics.
- **Split protocols:** business logic is split between **tRPC** and **two WebSocket systems** (app + realtime + collab), with **sensitive flows** (password change, **legacy** key rotation, etc.) on app-server WebSockets—duplication and more surfaces to regression-test. The restart **consolidates HTTP** behind **one REST+OpenAPI** layer and **drops** key-rotation paths entirely.
- **Forked/patched dependencies:** the client list includes **`@deepnotes/*` scoping** for Quasar, Vite app plugin, `superjson`, `ioredis`, `html2canvas`, tiptap collaboration cursor, and `dotenv-expand` patches—each is ongoing **security and upgrade debt**.

### 3.2 Slow build and tooling drift

- **Vite 2** and old Quasar app pipelines are far behind current Vite performance and ecosystem; **4 GB heap** in client build scripts is a red flag.
- **pnpm 7.6.0** and **root `engines.node`: `>=14`** are out of step with modern LTS and with **CI** (e.g. Node 18/20 in places per docs)—harmonize early in a new project.
- **Client is outside** `tsconfig.packages.json` references, so the **typecheck story** is split (Quasar/Vue vs. packages), which often hurts “instant” feedback in the IDE.

### 3.3 Slow debugging feedback loop

- Server `dev` scripts in several apps use **`tsx --inspect-brk`** (breakpoint at startup unless changed)—fine for one-off debugging, **expensive** as a daily default.
- **Sparse automated tests** in `apps/client` and `apps/app-server` (documented in [TECHNICAL_OVERVIEW.md](./TECHNICAL_OVERVIEW.md)); most coverage lives in `@stdlib/*` and `@deeplib/misc`, so refactors are **high manual verification** cost.

### 3.4 Data and operations gaps

- **Migrations:** without a **repeatable, ordered migration** story, any new service that shares the same DB is gambling on one-off DBA steps.
- **Multi-service deployment:** **five** long-running entrypoints (client builds aside) increase coordination cost; a restart is an opportunity to **document** and eventually **consolidate** (only after contracts are clear).

---

## 4. Compatibility and migration surface

### 4.0 New “API product” (authoritative for the greenfield app)

- **OpenAPI 3** spec (generated or hand-maintained) + **Zod/Valibot** as the single source of truth for request/response bodies.  
- **Drizzle** `schema.ts` (or split table files) drives **migrations**; the OpenAPI and DB layer stay in sync by convention and **CI checks** (or codegen from one source—pick one pattern and stick to it).

**Legacy tRPC (reference only for migration and parity checklists, not a wire target):** the old app exposed **~60+** procedure implementations under `apps/app-server/src/trpc/api/`, with routers for `users` (account, pages), `sessions`, `groups`, `pages`. When porting *behavior*, use that tree and `router.ts` as a **checklist of features** to re-cover in REST, not as something to emulate on the wire.

### 4.1 Legacy HTTP (not preserved)

- The old **tRPC** paths (`POST /trpc/...`, **`superjson`**) and **relying on** `@deepnotes/app-server`’s `AppRouter` in the **client** go away.  
- **Feature parity** (login, page CRUD, groups, etc.) is implemented as **new** REST (or resource-style) endpoints. Old mobile/desktop builds that still call `/trpc` would need a **dedicated** compatibility gateway—**out of scope** unless you add it explicitly for a straggler user cohort.

### 4.2 App-server WebSocket routes (legacy) — which to reimplement

`srv/fastify` registers hand-written handlers under `apps/app-server/src/websocket/` (groups, pages/move, user account, **key rotation** for users and groups). For the new stack:

- **Reimplement** the flows you still need (e.g. password change, page move, group invites) **on new WebSocket paths or the REST layer**, with **fresh** message shapes documented next to OpenAPI.  
- **Do not reimplement** **user** or **group** **rotate keys** (see *Decided stack* above).  
- If you need **one** “sensitive” channel, prefer **fewer** long-lived WebSockets and more **idempotent** REST for anything that is not high-frequency.

### 4.3 Realtime and collab servers

- **Realtime:** JWT from cookies on HTTP upgrade; **msgpackr**-based custom protocol; `/metrics` on the HTTP side. Reference: `apps/client/src/code/areas/realtime/`.  
- **Collab:** per-page Yjs-style updates + awareness; URL pattern **`…/page:{pageId}`**; binary messages via **lib0** encodings (`apps/client/src/code/pages/page/collab/websocket.ts`). The legacy **collab-server** also encodes **scheduled key rotation** (`next_key_rotation_date`); the new service **omits** that path entirely (no background re-encryption; keys stay stable).

Capture **message types** (`@deeplib/misc` collab message enums) and on-the-wire order as **golden fixtures** for whatever you keep byte-compatible; otherwise treat as **reimplement** with a **versioned** collab protocol and one released client.

### 4.4 Auth and session model

- **HTTP-only cookies**; **`accessToken`** and **`loggedIn`** can remain the names for **WS** auth on upgrade if you want minimal client change in those layers.  
- **Redis (standard):** session invalidation flags, rate limits, and any **cache** that replaces the old **DataAbstraction**-style projections—implemented with **portable** commands only (see *Redis vs KeyDB caveat* above). Replace `KEYDB_HOSTS` / `KEYDB_PASSWORD` with a conventional **`REDIS_URL`** (or `REDIS_HOST` / `PORT` / `PASSWORD`) in the new app’s `template.env`.

### 4.5 PostgreSQL schema, Drizzle, and encryption

- **Drizzle** should **reflect** the migrated schema: start from **`postgres-init.sql`**, import or transcribe into `schema.ts`, and **emit** migrations. Columns tied only to **rotation** (e.g. `next_key_rotation_date` on `pages` in the old model) can become **unused** and later dropped in a separate migration, or be left **nullable inert** during the first cut.  
- **E2E:** [NON_TECHNICAL_OVERVIEW.md](./NON_TECHNICAL_OVERVIEW.md) and the **Whitepaper** remain the product story; the new codebase needs **tests** for encrypt/decrypt and page load, **without** rotation code paths.

### 4.6 Billing and devices

- **Stripe** (web) only for the new stack—webhook signing, customer portal, checkout. **RevenueCat** is **not** reimplemented. Existing subscribers who only used mobile IAP will need a **one-time** migration story (e.g. link to Stripe, grace period, or support-led)—set explicitly in product, not in this plan. **Device** / **session** tables are modeled in Drizzle as needed.

---

## 5. Proposed target shape (aligned with decided choices)

1. **Contracts: OpenAPI + Zod/Valibot**  
   A small **`@deepnotes/api`** (name TBD) package contains **route handlers**’ input/output types and a published **OpenAPI** document. The **Drizzle** package stays separate to avoid server importing UI and vice versa. For **realtime** / **collab**, add a short **appendix** (or separate JSON spec) for message kinds and field order.

2. **Drizzle from day one**  
   **One migration chain:** `drizzle-kit` (or equivalent) applied to Postgres; devs never rely on a single frozen `postgres-init.sql` for drift long term—use it only as the **import** source for the first `schema.ts`.

3. **HTTP server**  
   **Fastify** or **Hono** (team choice) on Node: REST routes, **no** tRPC plugin. **Cookie** + **JWT** **middleware** shared with any WebSocket upgrade. **@fastify/rate-limit** (or Hono rate limit) backed by **ioredis** to **vanilla Redis**.

4. **Redis**  
   Single **Redis 7+** (or LTS) in `docker-compose` and prod; no KeyDB module assumptions. Replaces **DataAbstraction** with **narrower, explicit** repositories (cache-aside or simple keys + pub/sub if still needed for multi-instance cache coherence).

5. **New client application**  
   - **Vite 6+** + **Vue 3.5+** (or chosen framework) with `fetch` + **openapi-typescript** (or **hey-api** client) generated from the spec—**no** `trpc` client, **no** `superjson`.  
   - **Tiptap + Yjs** for the editor if you want to cap risk; **collab-server** either forked to strip rotation or rewritten against the same Yjs wire.  
   - **Electron** / **Capacitor** after the web app is solid.

6. **CI/CD and observability**  
   As before: one CI, Node LTS matrix, E2E smoke, **Prometheus** `/metrics` on services that need SLOs.

---

## 6. Phased work plan (recommended order)

### Phase 0 — inventory to OpenAPI and Drizzle (1–2 weeks)

- From the legacy `app-server`, list **tRPC** procedures and **WebSocket** handlers and map them to **proposed REST + WS** resource names; produce a **skeleton OpenAPI** (endpoints can `501` at first).  
- Transcribe `postgres-init.sql` into a **Drizzle schema** and generate **migration 0001** (or squash later—goal is a **repeatable** chain).  
- Document **cookie names**, **JWT** claims, and **CORS** origins.  
- List which **`@deepnotes/*`** forks the **new** client can avoid entirely.

**Exit:** OpenAPI v0 + Drizzle schema in source control; feature checklist derived from the old tRPC tree.

### Phase 1 — optional: legacy repo hygiene (parallel track)

Only if you still touch the old monorepo: remove default **`--inspect-brk`**, add minimal tests, and align Node/pnpm. **Do not** invest in extracting **tRPC** types for the new world—favor **Phase 0** instead.

**Exit:** optional; can be skipped if the team goes straight to the new repository.

### Phase 2 — new repository bootstrap

- New repo: **pnpm** + **Turborepo 2** (or Nx)—**Node 22/24** LTS.  
- **Docker compose:** **Postgres** + **Redis** (not KeyDB). New env file with **`REDIS_URL`**-style settings.  
- **CI** green: lint, typecheck, `drizzle-kit check`, unit smoke.

### Phase 3 — backend features on REST + Drizzle

- Implement **auth and sessions** (cookies + JWT) and core **pages** / **groups** routes against **Drizzle**; add **realtime** and **collab** services **without** key-rotation and **without** tRPC.  
- **Load tests** on collab and realtime only after the protocol is frozen.  
- **Stripe** webhooks; **no** RevenueCat.

### Phase 4 — new client MVP

- Feature slice: **auth** → **page list** → **single page** → **Yjs collab** → **groups** subset.  
- Reuse or port **`@stdlib/crypto`**, `@deeplib/misc` where domain-stable; delete dead code as you go.  
- **Electron** and **Capacitor** after web parity (they multiply CI cost).

### Phase 5 — cutover and decommissioning

- **Staged rollout:** canary users, then full redirect; old **`/trpc`** stack retired when **no** supported client still calls it (or keep a read-only **legacy** deployment for a defined window).  
- Decommission the old monorepo only when **error rates**, **Stripe**, **E2E**, and **data** checks (random page decrypt) are green.

---

## 7. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| REST hand-written drift vs **OpenAPI** | Generate types from the spec (or use Zod-to-OpenAPI) and **test** 4xx/5xx contracts in CI. |
| Collab **binary** protocol mismatch or dropped rotation | Decide **byte parity** vs **bump collab v2**; for v2, ship **one** new client and retire old together. **Document** that rotation is no longer a safety valve—rely on strong at-rest and transport crypto without periodic rekey. |
| **Redis** lacks KeyDB’s **`expiremember`** and similar | Redesign those fields as first-class keys or standard hash + TTL; benchmark before cutover. |
| **Stripe-only** after dropping RevenueCat | User comms and support scripts for any **IAP-only** customers; one-time data fix if `users` has provider-specific fields. |
| Dropping **key rotation** in collab with **live** old servers | **Cut over collab and app together** so no mixed fleet runs incompatible rotation expectations. |
| **2FA** and group **password** flows | Still re-test hard; rotation removal does not remove all crypto edge cases. |
| Migration mistakes on live Postgres | Staged env + backup + runbook; Drizzle migrations reviewed like production DDL. |
| Quasar + mobile matrix | Defer **Capacitor/Electron**; **web** first. |

---

## 8. Success criteria (objective)

- [ ] **OpenAPI** is the **source of truth** for public HTTP; client uses **generated** types or shared Zod.  
- [ ] **Drizzle** migrations apply from **empty** DB to **current** schema deterministically; production upgrade path is documented.  
- [ ] **< 2 s** cold `dev` **API** start (no `inspect-brk` by default) on a standard laptop.  
- [ ] **Collab** + **realtime** each have at least one **integration** test against **Redis** + in-memory or dockerized deps.  
- [ ] **No tRPC** and **no** `superjson` in the new default stack. **No** RevenueCat. **Key rotation** code paths are **absent** and the team signed off on **IAP** / **Stripe** user handling.  
- [ ] **Zero** undocumented framework forks in the new default client, or a short exception list with an owner.  

---

## 9. Related documents

- [NON_TECHNICAL_OVERVIEW.md](./NON_TECHNICAL_OVERVIEW.md) — product, privacy, plans, and limitations.  
- [TECHNICAL_OVERVIEW.md](./TECHNICAL_OVERVIEW.md) — architecture map, commands, and known caveats (the **tRPC/KeyDB/RevenueCat** parts describe the **old** app).  
- `template.env` — **legacy** env names; the new app introduces **`REDIS_*`**, drops **KeyDB-** specific names, and does not add **RevenueCat** variables.  
- `apps/app-server/src/trpc/router.ts` and `apps/app-server/src/trpc/api/**` — **legacy** procedure checklist for feature parity, not a wire spec.  
- `apps/app-server/src/websocket/**` — **legacy** WS; **user/group rotate-keys** are **out of scope** for the new product.  
- `postgres-init.sql` — import baseline for **Drizzle** `schema.ts`.  
- Up-to-date **Drizzle** (schema + migrations) documentation for the version you pin (e.g. via the Context7 MCP in Cursor if available).

---

## 10. Summary

This restart is **intentionally not tRPC- or KeyDB-compatible** on the wire. Success depends on **OpenAPI + REST**, **Drizzle** migrations, **vanilla Redis**, a **simpler crypto story** (no key rotation, no **RevenueCat**), and a **coordinated** rollout of the new **HTTP** stack with **realtime**/**collab** and clients that no longer expect `/trpc` or scheduled re-keying. Treat the old monorepo as a **behavioral reference** and a **one-time** source of schema and test vectors, then retire it when parity and data checks are proven.
