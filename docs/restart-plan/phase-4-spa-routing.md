# Phase 4: SPA foundation + feature slice routing

> **Prerequisites:** Phase 0 done.  
> **Status:** Complete

---

## Goal

The web app has a stable shell, feature-based routing, and the `spatial/` feature folder is ready to receive code.

---

## Deliverables

1. **App shell layout**
   - `App.vue` renders a consistent header, sidebar (if needed), and router outlet.
   - Theme switcher works across all routes.
   - `useSession` bootstrap runs once on app mount.

2. **Feature-based route registration**
   - `router.ts` imports route definitions from each feature:
     - `features/auth/auth-routes.ts`
     - `features/pages/pages-routes.ts`
     - `features/groups/groups-routes.ts`
     - `features/spatial/spatial-routes.ts`
   - No route definition lives outside its feature.

3. **Route middleware refactoring in `apps/api-worker`**
   - Create Hono middleware `requireSessionEnv()`, `requireHyperdrive()`, `requireAuthCookie()` in a new file (e.g., `src/middleware.ts`).
   - Refactor all route files (`sessions.ts`, `users.ts`, `groups.ts`, `pages.ts`, `billing.ts`, `realtime.ts`) to use middleware instead of repeating inline null-checks.
   - Goal: no route handler exceeds 30 lines of boilerplate; shared logic lives in middleware.

4. **ESLint import restriction**
   - Add `import/no-restricted-paths` rule (or `dependency-cruiser`) enforcing:
     - `apps/web` may NOT import from `apps/api-worker`, `@deepnotes/db`, `drizzle-orm`.
     - Features may only import from `src/shared/ui`, `src/api`, `src/lib`, and themselves.

5. **Test infrastructure hardening**
   - Every feature has a co-located `__tests__` folder or `*.test.ts` files.
   - `pnpm --filter @deepnotes/web test` runs in < 30 seconds.

6. **Route consolidation decision**
   - Resolve the routing divergence: make `/pages/:pageId` the spatial canvas. The Tiptap editor becomes the head/body editing component inside a note.
   - Document the decision in `docs/ROUTING_DECISION.md`.
   - Create a migration plan for existing page bookmarks and shared links if URLs change.

---

## Verification

- `app.test.ts` passes (shell renders, auth state reflects cookie).
- `router.test.ts` passes (all expected routes registered, no duplicates).
- ESLint passes with zero violations of restricted imports.

---

## Exit criteria

- [x] `pnpm test` passes for `@deepnotes/web`.
- [x] `pnpm lint` passes for `@deepnotes/web`.
- [x] Adding a new feature route requires changes in **only one folder**.
- [x] `docs/ROUTING_DECISION.md` exists and is signed off by product.
- [x] `apps/api-worker` route files use middleware for `sessionEnv`, `hyperdrive`, and `authCookie` checks; no route repeats > 10 lines of boilerplate.
