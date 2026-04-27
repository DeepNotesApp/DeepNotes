# Auth cookies, JWT claims, and CORS (legacy → new stack)

This document captures **current legacy** behavior from `apps/app-server` so the new API can align deliberately (names may stay; paths and bodies are new per RESTART_PLAN).

## HTTP cookies

| Cookie | Purpose | Notes |
|--------|---------|--------|
| `accessToken` | JWT access token | `httpOnly`, `secure` when not `DEV`, `sameSite: 'strict'`, path `/` |
| `refreshToken` | JWT refresh token | same defaults as access |
| `loggedIn` | Client hint (`"true"`) | **`httpOnly: false`** so the SPA can branch UI; sameSite/path as above |

Clearing session clears all three (`src/utils/cookies.ts`).

## JWT signing

| Token | Env secret | Durations (from `@deeplib/misc`) |
|-------|------------|-----------------------------------|
| Access | `ACCESS_SECRET` | 30 minutes |
| Refresh (short session) | `REFRESH_SECRET` | 1 hour |
| Refresh (“remember me”) | `REFRESH_SECRET` | 7 days |

## Access token payload (`AccessTokenPayload`)

| Claim | Meaning |
|-------|---------|
| `uid` | User id (nanoid-style string) |
| `sid` | Session id |

## Refresh token payload (`RefreshTokenPayload`)

| Claim | Meaning |
|-------|---------|
| `sid` | Session id |
| `rfc` | Refresh code (server-side validation) |
| `rms` | Remember-session flag |

## New stack env (target)

Use **`JWT_SECRET`** (or split **`ACCESS_SECRET`** / **`REFRESH_SECRET`**) in Wrangler secrets and local `.env`; document final names when the auth package lands. Do not ship secrets to the client bundle.

## CORS (legacy reference)

Legacy `@fastify/cors` (`apps/app-server/src/fastify/server.ts`):

- `credentials: true`
- Allowed origins when **not** `DEV`: `process.env.CLIENT_URL`, `capacitor://deepnotes.app`, `http://localhost`, or `undefined` (non-browser)
- In `DEV`, all origins allowed

The new stack should set an explicit allowlist for production: **web app origin** (e.g. Pages URL), **API subdomain** if distinct, and any **Capacitor** scheme you still support. Stripe dashboard webhook URL is server-to-server (no browser CORS).
