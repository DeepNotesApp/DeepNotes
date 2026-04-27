# @deepnotes/web

Vue 3 SPA for the greenfield stack. The bundle talks to the API only through [`src/api/`](./src/api/) (OpenAPI-generated `paths` + `openapi-fetch`); it does not import server or Drizzle packages at runtime.

## Styling

- **Tailwind CSS v4** with the [Vite plugin](https://tailwindcss.com/docs/installation/framework-guides) (`@tailwindcss/vite` in [`vite.config.ts`](./vite.config.ts)), global entry [`src/styles/globals.css`](./src/styles/globals.css).
- **[shadcn-vue](https://www.shadcn-vue.com/)** (Reka + `components.json`); UI primitives live under [`src/components/ui/`](./src/components/ui). Add more with:

  `pnpm dlx shadcn-vue@latest add <component> --yes`

- **Imports:** Vite + `tsconfig` path alias `@` → [`src`](./tsconfig.app.json) (e.g. `@/components/ui/button`).

## Layout

- `src/api/` — `createDeepnotesApiClient`, generated types (`pnpm run generate:api-types` when `packages/api` changes).
- `src/features/auth/` — session bootstrap (`/api/sessions/refresh` + `GET /api/users/me` when the `loggedIn` cookie is set), demo login, email/password + 2FA step, shared helpers.
- `src/features/home/` — first shell screen after auth.
- `src/features/groups/` — `GET /api/users/me/groups` plus per-group `main-page`, `members`, and `pages` (first window) for a read-only [Groups](src/features/groups/GroupsView.vue) screen (`/groups`, signed-in only).
- `src/features/notifications/` — `GET /api/users/me/notifications` and `POST …/notifications/read` for [Notifications](src/features/notifications/NotificationsView.vue) (`/notifications`, signed-in only; list shows `type` + time, bodies stay encrypted in this MVP).
- `src/router.ts` — `vue-router` history routes.

## Local dev

- API base URL defaults to same origin. With `pnpm` dev for this app, Vite proxies `/api` to `http://127.0.0.1:8787` (run `wrangler dev` in `api-worker` there).
- Override with `VITE_API_URL` (no trailing slash) for a different host.

## Sign-in contract

- **Password login** sends `loginHash` as standard base64 over the UTF-8 bytes of the password. Any future `POST /api/users` registration UI must use the same preimage so Argon2 verification matches.
- **Demo** uses `POST /api/sessions/demo` with random ciphertext-shaped payloads (see `build-demo-session.ts`).

See also [../docs/AUTH_AND_CORS.md](../docs/AUTH_AND_CORS.md).

## Testing

- **Vitest** (`pnpm test`): feature unit tests, [client.test.ts](./src/api/client.test.ts) (mocked `fetch`), and [client.contract.test.ts](./src/api/client.contract.test.ts) with **MSW** ([src/test/msw/](./src/test/msw/) handlers for OpenAPI-shaped `GET /api/health` and `GET /api/users/me`).
- **ESLint** (`pnpm lint`): `src/**/*.ts` + `no-restricted-imports` so the app does not import `@deepnotes/api-worker`, `@deepnotes/db`, `@deepnotes/api`, `@deepnotes/session`, or `drizzle-orm` (see [eslint.config.js](./eslint.config.js)).
