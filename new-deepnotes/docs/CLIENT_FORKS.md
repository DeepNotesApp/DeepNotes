# Legacy `@deepnotes/*` forks — new client stance

The greenfield SPA under `apps/web` uses **stock Vite 6 + Vue 3** with **no** workspace-scoped Quasar/Vite forks. This list records what the **legacy** client depended on so we do **not** reintroduce them by accident.

## Not used in `new-deepnotes` (default)

| Legacy package / area | Role in old client | New approach |
|----------------------|-------------------|----------------|
| `@deepnotes/quasar`, `@deepnotes/quasar-app-vite` | UI shell, build | Plain Vue + Vite; no Quasar |
| `@deepnotes/app-server` / `AppRouter` | tRPC types | OpenAPI + `fetch` / generated client |
| `superjson` | tRPC serialization | JSON + explicit schemas |
| Forked `ioredis`, `html2canvas`, Tiptap collaboration cursor, `dotenv-expand` | Various | Use upstream npm unless a **documented** exception is required |

## Exception process

If a fork is unavoidable, add a row here with **owner**, **reason**, and **upgrade plan**.

| Package | Owner | Reason | Plan |
|---------|-------|--------|------|
| — | — | — | — |

Crypto and domain libraries (`@stdlib/crypto`, `@deeplib/misc`, etc.) are **separate** from Quasar/Vite forks; port only what Phase 4 needs, as shared packages or vendored modules with tests.
