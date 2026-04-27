# Legacy tRPC / WebSocket → new HTTP map

Working checklist for Phase 0 of [docs/RESTART_PLAN.md](../../docs/RESTART_PLAN.md). Proposed paths are **suggestions**; wire `501 Not Implemented` until handlers exist. **Out of scope** for the new product: user/group **rotate keys** (WebSocket) and **RevenueCat**.

## Sessions (`sessionsRouter`)

| Legacy procedure | Proposed REST / notes |
|------------------|----------------------|
| `sessions.startDemo` | `POST /api/sessions/demo` |
| `sessions.login` | `POST /api/sessions/login` |
| `sessions.refresh` | `POST /api/sessions/refresh` |
| `sessions.logout` | `POST /api/sessions/logout` |

## Users — account (`users.account`)

| Legacy procedure | Proposed REST / notes |
|------------------|----------------------|
| `users.account.register` | `POST /api/users` |
| `users.account.resendVerificationEmail` | `POST /api/users/email-verification/resend` (public; body `{ "email" }` — matches legacy, not an authenticated “me” call) |
| `users.account.verifyEmail` | `POST /api/users/email-verification/confirm` (public; body `{ "emailVerificationCode" }`, nanoid) |
| `users.account.emailChange.request` | `POST /api/users/me/email-change` (body: `oldLoginHash` b64, `newEmail`; **204** or **200** with `{ "emailVerificationCode" }` when `SEND_EMAILS=false`) |
| `users.account.twoFactorAuth.enable.request` | `POST /api/users/me/2fa/enable/request` |
| `users.account.twoFactorAuth.enable.finish` | `POST /api/users/me/2fa/enable/finish` |
| `users.account.twoFactorAuth.load` | `GET /api/users/me/2fa` |
| `users.account.twoFactorAuth.generateRecoveryCodes` | `POST /api/users/me/2fa/recovery-codes` |
| `users.account.twoFactorAuth.forgetTrustedDevices` | `POST /api/users/me/2fa/devices/forget` |
| `users.account.twoFactorAuth.disable` | `POST /api/users/me/2fa/disable` |
| `users.account.stripe.createCheckoutSession` | `POST /api/billing/stripe/checkout-session` |
| `users.account.stripe.createPortalSession` | `POST /api/billing/stripe/portal-session` |
| `users.account.delete` | `DELETE /api/users/me` (JSON body `{ "loginHash" }` base64; clears cookies on 204; optional `deleteStripeCustomer` in worker when billing is wired) |
| (WS) `users.account.changePassword` step 1+2 | `POST /api/users/me/password` (JSON: `oldLoginHash`, `newLoginHash`, `userEncryptedPrivateKeyring`, `userEncryptedSymmetricKeyring` as base64; same keyring semantics as `POST /api/users`; 204 + clears cookies + invalidates all sessions) |

## Users — pages (`users.pages`)

| Legacy procedure | Proposed REST / notes |
|------------------|----------------------|
| `users.pages.notifications.load` | `GET /api/users/me/notifications` |
| `users.pages.notifications.markAsRead` | `POST /api/users/me/notifications/read` |
| `users.pages.getStartingPageId` | `GET /api/users/me/pages/starting` |
| `users.pages.getCurrentPath` | `GET /api/users/me/pages/path` |
| `users.pages.removeRecentPages` | `POST /api/users/me/pages/recent/remove` |
| `users.pages.clearRecentPages` | `POST /api/users/me/pages/recent/clear` |
| `users.pages.addFavoritePages` | `POST /api/users/me/pages/favorites` |
| `users.pages.removeFavoritePages` | `POST /api/users/me/pages/favorites/remove` |
| `users.pages.clearFavoritePages` | `POST /api/users/me/pages/favorites/clear` |
| `users.pages.setEncryptedDefaultNote` | `PATCH /api/users/me/defaults/note` |
| `users.pages.setEncryptedDefaultArrow` | `PATCH /api/users/me/defaults/arrow` |
| `users.pages.getGroupIds` | `GET /api/users/me/groups` |

## Groups (`groupsRouter`)

| Legacy procedure | Proposed REST / notes |
|------------------|----------------------|
| `groups.getMainPageId` | `GET /api/groups/:groupId/main-page` |
| `groups.getUserIds` | `GET /api/groups/:groupId/members` (ids / minimal DTO) |
| `groups.getPages` | `GET /api/groups/:groupId/pages` |
| `groups.password.enable` | `POST /api/groups/:groupId/password` |
| `groups.password.change` | `PATCH /api/groups/:groupId/password` |
| `groups.password.disable` | `DELETE /api/groups/:groupId/password` |
| `groups.privacy.makePublic` | `POST /api/groups/:groupId/privacy/public` |
| `groups.privacy.setJoinRequestsAllowed` | `PATCH /api/groups/:groupId/privacy/join-requests` |
| `groups.deletion.delete` | `DELETE /api/groups/:groupId` (soft) |
| `groups.deletion.restore` | `POST /api/groups/:groupId/restore` |
| `groups.deletion.deletePermanently` | `POST /api/groups/:groupId/purge` |

## Pages (`pagesRouter`)

| Legacy procedure | Proposed REST / notes |
|------------------|----------------------|
| `pages.create` | `POST /api/groups/:groupId/pages` |
| `pages.bump` | `POST /api/pages/:pageId/bump` |
| `pages.backlinks.create` | `POST /api/pages/:pageId/backlinks` |
| `pages.backlinks.delete` | `DELETE /api/pages/:pageId/backlinks/:targetPageId` |
| `pages.snapshots.save` | `POST /api/pages/:pageId/snapshots` |
| `pages.snapshots.load` | `GET /api/pages/:pageId/snapshots/:snapshotId` |
| `pages.snapshots.delete` | `DELETE /api/pages/:pageId/snapshots/:snapshotId` |
| `pages.deletion.delete` | `DELETE /api/pages/:pageId` (soft) |
| `pages.deletion.restore` | `POST /api/pages/:pageId/restore` |
| `pages.deletion.deletePermanently` | `POST /api/pages/:pageId/purge` |

## Legacy app-server WebSocket → target

| Legacy handler | New surface | Notes |
|----------------|-------------|--------|
| `websocket/groups/join-invitations/*` | `WS /api/ws/groups/...` or REST for low-frequency | send / accept / reject / cancel |
| `websocket/groups/join-requests/*` | same | send / accept / reject / cancel |
| `websocket/groups/change-user-role` | `PATCH /api/groups/:groupId/members/:userId` | prefer REST if acceptable |
| `websocket/groups/remove-user` | `DELETE /api/groups/:groupId/members/:userId` | |
| `websocket/groups/privacy/make-private` | `POST /api/groups/:groupId/privacy/private` | |
| `websocket/groups/rotate-keys` | — | **removed** per RESTART_PLAN |
| `websocket/pages/move` | `POST /api/pages/:pageId/move` | |
| `websocket/users/account/change-password` | `POST /api/users/me/password` | **implemented** in `@deepnotes/session` (`performUserPasswordChange`) |
| `websocket/users/account/email-change/finish` | `POST /api/users/me/email-change/confirm` | **implemented** — one call: `oldLoginHash`, `emailVerificationCode` (6 digits), `newLoginHash`, `userEncryptedPrivateKeyring`, `userEncryptedSymmetricKeyring` (b64; same as register/password); 204, clears cookies; optional Stripe in worker |
| `websocket/users/account/rotate-keys` | — | **removed** |

## Webhooks (not tRPC)

| Legacy | New |
|--------|-----|
| Stripe webhook (Fastify) | `POST /api/webhooks/stripe` |
| RevenueCat webhook | **not implemented** |

Reference routers: `apps/app-server/src/trpc/router.ts`, `apps/app-server/src/trpc/api/**`, `apps/app-server/src/websocket/**`.
