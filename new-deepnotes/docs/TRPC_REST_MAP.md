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
| `users.account.twoFactorAuth.load` | `POST /api/users/me/2fa/load` (body `{ "loginHash" }` — **not** `GET` with a password, to avoid query/logging leakage) |
| `users.account.twoFactorAuth.generateRecoveryCodes` | `POST /api/users/me/2fa/recovery-codes` |
| `users.account.twoFactorAuth.forgetTrustedDevices` | `POST /api/users/me/2fa/devices/forget` |
| `users.account.twoFactorAuth.disable` | `POST /api/users/me/2fa/disable` |
| `users.account.stripe.createCheckoutSession` | `POST /api/billing/stripe/checkout-session` (**implemented** — optional body `{ "billingFrequency"?: "monthly" \| "yearly" }`; **200** `{ "checkoutSessionUrl" }`; requires verified email; `STRIPE_*` + Hyperdrive in worker) |
| `users.account.stripe.createPortalSession` | `POST /api/billing/stripe/portal-session` (**implemented** — **200** `{ "portalSessionUrl" }`; requires `users.customer_id`) |
| `users.account.delete` | `DELETE /api/users/me` (JSON body `{ "loginHash" }` base64; clears cookies on 204; optional `deleteStripeCustomer` in worker when billing is wired) |
| (WS) `users.account.changePassword` step 1+2 | `POST /api/users/me/password` (JSON: `oldLoginHash`, `newLoginHash`, `userEncryptedPrivateKeyring`, `userEncryptedSymmetricKeyring` as base64; same keyring semantics as `POST /api/users`; 204 + clears cookies + invalidates all sessions) |
| *(greenfield; replaces KeyDB `user:{id}:public-keyring` for invites)* | `GET /api/users/:userId/public-keyring` (**implemented** — `performGetUserPublicKeyring`; any authenticated user) |

## Users — pages (`users.pages`)

| Legacy procedure | Proposed REST / notes |
|------------------|----------------------|
| `users.pages.notifications.load` | `GET /api/users/me/notifications` (**implemented** — `performLoadNotifications`; ciphertext fields base64 in JSON; optional `lastNotificationId` query) |
| `users.pages.notifications.markAsRead` | `POST /api/users/me/notifications/read` (**implemented** — `performMarkNotificationsRead`) |
| `users.pages.getStartingPageId` | `GET /api/users/me/pages/starting` (**implemented** — `performGetStartingPageId`) |
| `users.pages.getCurrentPath` | `GET /api/users/me/pages/path?initialPageId=` (**implemented** — `performGetCurrentPath`; `users_pages` repair like legacy) |
| `users.pages.removeRecentPages` | `POST /api/users/me/pages/recent/remove` (**implemented** — JSON `{ "pageIds": [...] }`; `performRemoveRecentPages`) |
| *(greenfield read)* | `GET /api/users/me/pages/recent` (**implemented** — `performGetRecentPageIds`; returns `{ "pageIds": [...] }`) |
| `users.pages.clearRecentPages` | `POST /api/users/me/pages/recent/clear` (**implemented** — `performClearRecentPages`) |
| `users.pages.addFavoritePages` | `POST /api/users/me/pages/favorites` (**implemented** — `performAddFavoritePages`; favorites in Postgres `users.favorite_page_ids`, migration `0001_favorite_page_ids`) |
| *(greenfield read)* | `GET /api/users/me/pages/favorites` (**implemented** — `performGetFavoritePageIds`) |
| `users.pages.removeFavoritePages` | `POST /api/users/me/pages/favorites/remove` (**implemented** — `performRemoveFavoritePages`) |
| `users.pages.clearFavoritePages` | `POST /api/users/me/pages/favorites/clear` (**implemented** — `performClearFavoritePages`) |
| `users.pages.setEncryptedDefaultNote` | `PATCH /api/users/me/defaults/note` (**implemented** — JSON `userEncryptedDefaultNote` base64; `performPatchDefaultNote`) |
| `users.pages.setEncryptedDefaultArrow` | `PATCH /api/users/me/defaults/arrow` (**implemented** — `performPatchDefaultArrow`) |
| `users.pages.getGroupIds` | `GET /api/users/me/groups` (**implemented** — `performGetUserGroupIds` in `@deepnotes/session`) |

## Groups (`groupsRouter`)

| Legacy procedure | Proposed REST / notes |
|------------------|----------------------|
| `groups.getMainPageId` | `GET /api/groups/:groupId/main-page` (**implemented** — `performGetGroupMainPageId`; `groups.main_page_id`; requires `viewGroupPages`) |
| `groups.getUserIds` | `GET /api/groups/:groupId/members` (**implemented** — `performGetGroupMemberUserIds`; members ∪ join requests ∪ invitations; requires `viewGroupMembers`, not public-only read) |
| *(greenfield)* | `GET /api/groups/:groupId/members/detail` (**implemented** — `performGetGroupMembersDetail`; members with roles, pending invites/requests, viewer role, public flag, `joinRequestsAllowed`; same permission as `…/members`) |
| *(greenfield)* | `GET /api/groups/:groupId/invite-crypto-bootstrap` (**implemented** — `performGetGroupInviteCryptoBootstrap`; encrypted member/group key blobs for managers building slice-9 invite / join-request-accept bodies in the SPA) |
| *(greenfield)* | `GET /api/groups/:groupId/public-keyring` (**implemented** — `performGetGroupPublicKeyringForMessaging`; `groups.public_keyring` when caller may encrypt a display name: member, pending invitee, or join-requests allowed + not yet member) |
| `groups.getPages` | `GET /api/groups/:groupId/pages` (**implemented** — `performListGroupPages`; query `lastPageId`; soft-deleted pages excluded) |
| `groups.password.enable` | `POST /api/groups/:groupId/password` (**implemented** — `performGroupPasswordEnable`; Pro + `editGroupSettings`; `GROUP_REHASHED_PASSWORD_HASH_ENCRYPTION_KEY`) |
| `groups.password.change` | `PATCH /api/groups/:groupId/password` (**implemented** — `performGroupPasswordChange`) |
| `groups.password.disable` | `DELETE /api/groups/:groupId/password` (JSON body; **implemented** — `performGroupPasswordDisable`; not Pro-gated, legacy match) |
| `groups.privacy.makePublic` | `POST /api/groups/:groupId/privacy/public` (**implemented** — `performGroupPrivacyMakePublic`; clears `group_members` / `group_join_invitations` `encrypted_access_keyring`) |
| `groups.privacy.setJoinRequestsAllowed` | `PATCH /api/groups/:groupId/privacy/join-requests` (**implemented** — `performGroupPrivacySetJoinRequestsAllowed`) |
| *(greenfield read)* | `GET /api/groups/:groupId/collab-crypto-context` (**implemented** — `performGetGroupCollabCryptoContext`; `editGroupPages` + membership; exposes `encrypted_content_keyring` + access blobs for SPA destination unwrap on page move) |
| *(greenfield read)* | `GET /api/groups/:groupId/privacy/make-private-bootstrap` (**implemented** — `performGetGroupPrivacyMakePrivateBootstrap`; Pro + `editGroupSettings` + public group only; mirrors legacy WS make-private step 1 for browser `POST …/privacy/private`) |
| (WS) `groups.privacy.makePrivate` step 1+2 | `POST /api/groups/:groupId/privacy/private` (**implemented** — `performGroupPrivacyMakePrivate`; single body = legacy `rotateGroupKeys` / `groupKeyRotationSchema`; omits `pages.next_key_rotation_date` bumps per RESTART_PLAN) |
| `groups.deletion.delete` | `DELETE /api/groups/:groupId` (soft) (**implemented** — `performGroupSoftDelete`) |
| `groups.deletion.restore` | `POST /api/groups/:groupId/restore` (**implemented** — `performGroupRestore`; grace only; not after purge) |
| `groups.deletion.deletePermanently` | `POST /api/groups/:groupId/purge` (**implemented** — `performGroupPurge`) |

## Pages (`pagesRouter`)

| Legacy procedure | Proposed REST / notes |
|------------------|----------------------|
| `pages.create` | `POST /api/groups/:groupId/pages` (**implemented** — `performCreatePage`; optional `groupCreation` = new non-personal group + first page, same shape as `PageMoveGroupCreationRequest`, path `groupId` unused id; Pro + free-page rules per legacy) |
| `pages.bump` | `POST /api/pages/:pageId/bump` (**implemented** — `performPageBump`; path `pageId`, optional body `{ "parentPageId" }` must chain to personal main page) |
| `pages.backlinks.create` | `POST /api/pages/:pageId/backlinks` (**implemented** — `performPageBacklinkCreate`; path `pageId` = **target**; body `{ "sourcePageId" }`) |
| `pages.backlinks.delete` | `DELETE /api/pages/:pageId/backlinks/:targetPageId` (**implemented** — `performPageBacklinkDelete`; path `pageId` = **source**; `targetPageId` = link target) |
| `pages.snapshots.save` | `POST /api/pages/:pageId/snapshots` (**implemented** — `performPageSnapshotSave`; Pro; trim >10 + age rule like legacy `insertPageSnapshot`) |
| *(greenfield read)* | `GET /api/pages/:pageId/snapshots` (**implemented** — `performPageSnapshotList`; Pro; metadata only, newest first) |
| `pages.snapshots.load` | `GET /api/pages/:pageId/snapshots/:snapshotId` (**implemented** — `performPageSnapshotLoad`; Pro) |
| `pages.snapshots.delete` | `DELETE /api/pages/:pageId/snapshots/:snapshotId` (**implemented** — `performPageSnapshotDelete`) |
| `pages.deletion.delete` | `DELETE /api/pages/:pageId` (soft) (**implemented** — `performPageSoftDelete`) |
| `pages.deletion.restore` | `POST /api/pages/:pageId/restore` (**implemented** — `performPageRestore`) |
| `pages.deletion.deletePermanently` | `POST /api/pages/:pageId/purge` (**implemented** — `performPagePurge`; `num_free_pages` +1 when `pages.free` and user not Pro) |

### Collab bootstrap (new; not legacy tRPC)

| Capability | New surface | Notes |
|------------|-------------|--------|
| Load encrypted Yjs update chain from DB | `GET /api/pages/:pageId/collab-updates` (**implemented** — `performGetPageCollabUpdates`; `viewGroupPages`; Postgres `page_updates`; response includes **encrypted page titles** (`encrypted_relative_title` / `encrypted_absolute_title` b64), `groupId`, `pageEncryptedSymmetricKeyring`, `groupEncryptedContentKeyring`, `groupAccessKeyring`, `memberEncryptedAccessKeyring` for client-side unwrap + cross-group move) | Replaces initial `ALL_UPDATES_UNMERGED`-style payload for SPA bootstrap; binary collab WebSocket is still [Phase 3 — realtime/collab](../PLAN_PROGRESS.md#not-started-phase-3--realtime--collab-only). |
| Append updates (optimistic concurrency) | `POST /api/pages/:pageId/collab-updates` (**implemented** — `performAppendPageCollabUpdates`; `editGroupPages`; body `expectedLastIndex` + `updates[]`) | **409** when `expectedLastIndex` is stale. |
| Live duplex collab (Yjs + awareness relay, Postgres persist) | `GET /api/pages/:pageId/collab-ws` (**WebSocket Upgrade** — `PageCollabRoom` Durable Object; cookie auth; internal `POST /api/internal/pages/:pageId/collab-ws-append` with `COLLAB_INTERNAL_SECRET`) | Greenfield path: legacy **lib0** `CollabMessageType` framing via `@deepnotes/collab-wire`; no Redis merge / **no** key rotation (RESTART_PLAN). SPA falls back to REST when WS unavailable. |
| Live `USER_NOTIFICATION` (legacy Redis pub/sub) | `GET /api/realtime-ws` (**WebSocket** — `UserRealtimeRoom` Durable Object per `userId`; worker pushes framed payloads after `performNotifyUsers` with `REALTIME_INTERNAL_SECRET`) | `@deepnotes/realtime-wire` framing. Join-invite path persists rows + optional SPA E2EE `notifications` on `POST …/join-invitations`. **Not** legacy realtime-server **hash** `HGET` / `DATA_NOTIFICATION`. |

## Legacy app-server WebSocket → target

| Legacy handler | New surface | Notes |
|----------------|-------------|--------|
| `websocket/groups/join-invitations/send` | `POST /api/groups/:groupId/join-invitations` (**implemented** — `performGroupJoinInvitationSend`; optional body `notifications[]` for E2EE `notifyUsers` + realtime push; Pro; public groups omit `encryptedAccessKeyring`; `GET …/invite-crypto-bootstrap?inviteeUserId=` returns manager∪invitee public keys) | |
| `websocket/groups/join-invitations/accept` | `POST /api/groups/:groupId/join-invitations/me/accept` (**implemented** — `performGroupJoinInvitationAccept`) | |
| `websocket/groups/join-invitations/reject` | `POST /api/groups/:groupId/join-invitations/me/reject` (**implemented** — `performGroupJoinInvitationReject`; no Pro in legacy) | |
| `websocket/groups/join-invitations/cancel` | `DELETE /api/groups/:groupId/join-invitations/:userId` (**implemented** — `performGroupJoinInvitationCancel`; path `userId` = invitee) | |
| `websocket/groups/join-requests/send` | `POST /api/groups/:groupId/join-requests` (**implemented** — `performGroupJoinRequestSend`; requires `are_join_requests_allowed`) | |
| `websocket/groups/join-requests/accept` | `POST /api/groups/:groupId/join-requests/:userId/accept` (**implemented** — `performGroupJoinRequestAccept`) | |
| `websocket/groups/join-requests/reject` | `POST /api/groups/:groupId/join-requests/:userId/reject` (**implemented** — `performGroupJoinRequestReject`; sets `rejected`) | |
| `websocket/groups/join-requests/cancel` | `POST /api/groups/:groupId/join-requests/me/cancel` (**implemented** — `performGroupJoinRequestCancel`) | |
| `websocket/groups/change-user-role` | `PATCH /api/groups/:groupId/members/:userId` (**implemented** — `performGroupMemberRoleChange`) | |
| `websocket/groups/remove-user` | `DELETE /api/groups/:groupId/members/:userId` (**implemented** — `performGroupMemberRemove`; self-remove allowed) | |
| `websocket/groups/privacy/make-private` | `POST /api/groups/:groupId/privacy/private` | **implemented** — see `groups.privacy.makePrivate` row above |
| `websocket/groups/rotate-keys` | — | **removed** per RESTART_PLAN |
| `websocket/pages/move` | `POST /api/pages/:pageId/move` (**implemented** — `pageMoveRequestSchema`; `performPageMove`: Pro, optional `groupCreation`, `reencrypt` when changing group) | |
| `websocket/users/account/change-password` | `POST /api/users/me/password` | **implemented** in `@deepnotes/session` (`performUserPasswordChange`) |
| `websocket/users/account/email-change/finish` | `POST /api/users/me/email-change/confirm` | **implemented** — one call: `oldLoginHash`, `emailVerificationCode` (6 digits), `newLoginHash`, `userEncryptedPrivateKeyring`, `userEncryptedSymmetricKeyring` (b64; same as register/password); 204, clears cookies; optional Stripe in worker |
| `websocket/users/account/rotate-keys` | — | **removed** |

## Webhooks (not tRPC)

| Legacy | New |
|--------|-----|
| Stripe webhook (Fastify) | `POST /api/webhooks/stripe` (**implemented** — raw body + `Stripe-Signature`; `customer.subscription.updated` / `customer.subscription.deleted`; maps user by `users.customer_id`) |
| RevenueCat webhook | **not implemented** |

Reference routers: `apps/app-server/src/trpc/router.ts`, `apps/app-server/src/trpc/api/**`, `apps/app-server/src/websocket/**`.
