import {
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import type { OpenAPIObject } from "openapi3-ts/oas30";

import { healthResponseSchema } from "./schemas/health.js";
import {
  serviceUnavailableResponseSchema,
  sessionErrorResponseSchema,
  sessionLoginSuccessSchema,
  sessionRefreshSuccessSchema,
} from "./schemas/session-responses.js";
import {
  sessionDemoRequestSchema,
  sessionLoginRequestSchema,
  userRegisterRequestSchema,
} from "./schemas/sessions.js";
import {
  groupIdPathSchema,
  groupInviteCryptoBootstrapResponseSchema,
  groupMainPageResponseSchema,
  groupMembersDetailResponseSchema,
  groupMemberUserIdsResponseSchema,
  groupPublicKeyringResponseSchema,
  groupPageCreateRequestSchema,
  groupPageCreateResponseSchema,
  groupPagesListQuerySchema,
  groupPagesListResponseSchema,
  groupPasswordChangeRequestSchema,
  groupPasswordDisableRequestSchema,
  groupPasswordEnableRequestSchema,
  groupJoinInvitationAcceptRequestSchema,
  groupJoinInvitationSendRequestSchema,
  groupJoinRequestAcceptRequestSchema,
  groupJoinRequestSendRequestSchema,
  groupMemberRolePatchRequestSchema,
  groupPrivacyJoinRequestsPatchSchema,
  groupPrivacyPrivateRequestSchema,
  groupPrivacyPublicRequestSchema,
  groupUserIdPathSchema,
  pageBacklinkCreateRequestSchema,
  pageBumpRequestSchema,
  pageCollabUpdatesAppendRequestSchema,
  pageCollabUpdatesGetResponseSchema,
  pageMoveRequestSchema,
  pageIdPathSchema,
  pageSnapshotCreateResponseSchema,
  pageSnapshotLoadResponseSchema,
  pageSnapshotPathSchema,
  pageSnapshotSaveRequestSchema,
  pageTargetPagePathSchema,
  userGroupIdsResponseSchema,
} from "./schemas/pages-groups.js";
import {
  userCurrentPathResponseSchema,
  userDefaultArrowPatchSchema,
  userDefaultNotePatchSchema,
  userNotificationsLoadResponseSchema,
  userNotificationsQuerySchema,
  userPageIdsBodySchema,
  userPagesPathQuerySchema,
  userStartingPageResponseSchema,
} from "./schemas/user-pages.js";
import {
  stripeCheckoutSessionRequestSchema,
  stripeCheckoutSessionResponseSchema,
  stripePortalSessionResponseSchema,
} from "./schemas/billing.js";
import {
  emailVerificationConfirmRequestSchema,
  emailVerificationResendRequestSchema,
  user2faEnableFinishRequestSchema,
  user2faEnableRequestResponseSchema,
  user2faPasswordBodySchema,
  user2faRecoveryCodesResponseSchema,
  userAccountDeleteRequestSchema,
  userEmailChangeConfirmRequestSchema,
  userEmailChangeRequestResponseSchema,
  userEmailChangeRequestSchema,
  userIdPathSchema,
  userMeResponseSchema,
  userPasswordChangeRequestSchema,
  userPublicKeyringResponseSchema,
  userRegisterResponseSchema,
} from "./schemas/users.js";

const registry = new OpenAPIRegistry();

const sessionServiceUnavailable503 = {
  description:
    "Required auth environment variables are not configured (local: copy template.env / .dev.vars).",
  content: {
    "application/json": {
      schema: serviceUnavailableResponseSchema,
    },
  },
} as const;

const sessionUnauthorized401 = {
  description: "Invalid credentials, token, or session state.",
  content: {
    "application/json": {
      schema: sessionErrorResponseSchema,
    },
  },
} as const;

const sessionTooManyRequests429 = {
  description: "Too many failed login attempts (rate limited).",
  content: {
    "application/json": {
      schema: sessionErrorResponseSchema,
    },
  },
} as const;

const sessionConflict409 = {
  description: "Resource already exists (e.g. email already registered).",
  content: {
    "application/json": {
      schema: sessionErrorResponseSchema,
    },
  },
} as const;

const sessionNotFound404 = {
  description: "Resource not found.",
  content: {
    "application/json": {
      schema: sessionErrorResponseSchema,
    },
  },
} as const;

const sessionForbidden403 = {
  description: "Action not allowed for this account (e.g. demo user).",
  content: {
    "application/json": {
      schema: sessionErrorResponseSchema,
    },
  },
} as const;

registry.registerPath({
  method: "get",
  path: "/api/health",
  summary: "Health check",
  responses: {
    200: {
      description: "API is reachable",
      content: {
        "application/json": {
          schema: healthResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/sessions/login",
  summary: "Create session (email + login hash)",
  description:
    "Replaces legacy `sessions.login`. Sets httpOnly cookies when implemented.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: sessionLoginRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Login succeeded; cookies set.",
      content: {
        "application/json": {
          schema: sessionLoginSuccessSchema,
        },
      },
    },
    401: sessionUnauthorized401,
    429: sessionTooManyRequests429,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/users",
  summary: "Register a new account",
  description:
    "Replaces legacy `users.account.register`. Creates user, personal group, and first page; sets email verification unless `SEND_EMAILS=false` (then verifies immediately, legacy parity).",
  request: {
    body: {
      content: {
        "application/json": {
          schema: userRegisterRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description:
        "User created. `emailVerified` is true when outbound mail is disabled (`SEND_EMAILS=false`).",
      content: {
        "application/json": {
          schema: userRegisterResponseSchema,
        },
      },
    },
    400: {
      description: "Validation error.",
      content: {
        "application/json": {
          schema: sessionErrorResponseSchema,
        },
      },
    },
    401: sessionUnauthorized401,
    409: sessionConflict409,
    502: {
      description: "Email send failed (e.g. Resend API error after user row was created; rare).",
      content: {
        "application/json": {
          schema: sessionErrorResponseSchema,
        },
      },
    },
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "get",
  path: "/api/users/me",
  summary: "Current user (from access cookie)",
  description:
    "Minimal account summary for the authenticated user (`accessToken` cookie).",
  responses: {
    200: {
      description: "Authenticated user.",
      content: {
        "application/json": {
          schema: userMeResponseSchema,
        },
      },
    },
    401: sessionUnauthorized401,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "get",
  path: "/api/users/{userId}/public-keyring",
  summary: "User public keyring (E2EE box key)",
  description:
    "Returns `users.public_keyring` for wrapping group secrets when sending invitations. Any authenticated user may read (same visibility as legacy KeyDB `user:*:public-keyring`).",
  request: { params: userIdPathSchema },
  responses: {
    200: {
      description: "Base64 libsodium public keyring bytes.",
      content: {
        "application/json": {
          schema: userPublicKeyringResponseSchema,
        },
      },
    },
    401: sessionUnauthorized401,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "get",
  path: "/api/users/me/groups",
  summary: "List group IDs for the current user",
  description:
    "Replaces legacy `users.pages.getGroupIds`. Returns `group_id` values from `group_members` ordered by recent activity (desc).",
  responses: {
    200: {
      description: "Ordered group ids.",
      content: {
        "application/json": {
          schema: userGroupIdsResponseSchema,
        },
      },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "get",
  path: "/api/users/me/pages/starting",
  summary: "Starting page id for the current user",
  description: "Replaces legacy `users.pages.getStartingPageId` (reads `users.starting_page_id`).",
  responses: {
    200: {
      description: "Nanoid of the user’s starting page.",
      content: {
        "application/json": {
          schema: userStartingPageResponseSchema,
        },
      },
    },
    401: sessionUnauthorized401,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "get",
  path: "/api/users/me/pages/path",
  summary: "Breadcrumb path from a page to the personal main page",
  description:
    "Replaces legacy `users.pages.getCurrentPath`. Uses `users_pages.last_parent_id` and may repair a missing parent link once (legacy KeyDB behavior).",
  request: {
    query: userPagesPathQuerySchema,
  },
  responses: {
    200: {
      description: "Ordered page ids from root (personal main) to `initialPageId`.",
      content: {
        "application/json": {
          schema: userCurrentPathResponseSchema,
        },
      },
    },
    400: {
      description: "Missing or invalid `initialPageId` query parameter.",
      content: {
        "application/json": {
          schema: sessionErrorResponseSchema,
        },
      },
    },
    401: sessionUnauthorized401,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/users/me/pages/recent/remove",
  summary: "Remove page ids from recent list",
  description: "Replaces legacy `users.pages.removeRecentPages`.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: userPageIdsBodySchema,
        },
      },
    },
  },
  responses: {
    204: { description: "Updated `users.recent_page_ids`." },
    400: {
      description: "Validation error.",
      content: {
        "application/json": {
          schema: sessionErrorResponseSchema,
        },
      },
    },
    401: sessionUnauthorized401,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/users/me/pages/recent/clear",
  summary: "Clear recent pages",
  description: "Replaces legacy `users.pages.clearRecentPages`.",
  responses: {
    204: { description: "Recent list emptied." },
    401: sessionUnauthorized401,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/users/me/pages/favorites",
  summary: "Add favorite pages",
  description:
    "Replaces legacy `users.pages.addFavoritePages`. Favorites are stored in Postgres (`users.favorite_page_ids`); legacy used KeyDB only.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: userPageIdsBodySchema,
        },
      },
    },
  },
  responses: {
    204: { description: "Favorites merged (order: new ids first, then existing)." },
    400: {
      description: "Validation error.",
      content: {
        "application/json": {
          schema: sessionErrorResponseSchema,
        },
      },
    },
    401: sessionUnauthorized401,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/users/me/pages/favorites/remove",
  summary: "Remove favorite pages",
  description: "Replaces legacy `users.pages.removeFavoritePages`.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: userPageIdsBodySchema,
        },
      },
    },
  },
  responses: {
    204: { description: "Favorites updated." },
    400: {
      description: "Validation error.",
      content: {
        "application/json": {
          schema: sessionErrorResponseSchema,
        },
      },
    },
    401: sessionUnauthorized401,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/users/me/pages/favorites/clear",
  summary: "Clear favorite pages",
  description: "Replaces legacy `users.pages.clearFavoritePages`.",
  responses: {
    204: { description: "Favorites emptied." },
    401: sessionUnauthorized401,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/users/me/defaults/note",
  summary: "Update encrypted default note template",
  description: "Replaces legacy `users.pages.setEncryptedDefaultNote`.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: userDefaultNotePatchSchema,
        },
      },
    },
  },
  responses: {
    204: { description: "`users.encrypted_default_note` updated." },
    400: {
      description: "Validation error.",
      content: {
        "application/json": {
          schema: sessionErrorResponseSchema,
        },
      },
    },
    401: sessionUnauthorized401,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/users/me/defaults/arrow",
  summary: "Update encrypted default arrow template",
  description: "Replaces legacy `users.pages.setEncryptedDefaultArrow`.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: userDefaultArrowPatchSchema,
        },
      },
    },
  },
  responses: {
    204: { description: "`users.encrypted_default_arrow` updated." },
    400: {
      description: "Validation error.",
      content: {
        "application/json": {
          schema: sessionErrorResponseSchema,
        },
      },
    },
    401: sessionUnauthorized401,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "get",
  path: "/api/users/me/notifications",
  summary: "Load notifications for the current user",
  description:
    "Replaces legacy `users.pages.notifications.load`. Ciphertext fields are base64 in JSON.",
  request: {
    query: userNotificationsQuerySchema,
  },
  responses: {
    200: {
      description: "Window of notifications and optional `lastNotificationRead`.",
      content: {
        "application/json": {
          schema: userNotificationsLoadResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid query parameters.",
      content: {
        "application/json": {
          schema: sessionErrorResponseSchema,
        },
      },
    },
    401: sessionUnauthorized401,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/users/me/notifications/read",
  summary: "Mark all notifications as read",
  description:
    "Replaces legacy `users.pages.notifications.markAsRead`. Sets `users.last_notification_read` to the latest linked notification id.",
  responses: {
    204: { description: "Read cursor updated (no-op if user has no notifications)." },
    401: sessionUnauthorized401,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "get",
  path: "/api/groups/{groupId}/main-page",
  summary: "Get the group main page id",
  description:
    "Replaces legacy `groups.getMainPageId` (KeyDB `main-page-id`). Source: `groups.main_page_id`. Requires `viewGroupPages` (same as listing pages).",
  request: { params: groupIdPathSchema },
  responses: {
    200: {
      description: "Main page id for the group.",
      content: {
        "application/json": { schema: groupMainPageResponseSchema },
      },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "get",
  path: "/api/groups/{groupId}/members",
  summary: "List user ids (members, requests, invitations)",
  description:
    "Replaces legacy `groups.getUserIds`: union of `group_members`, `group_join_requests`, and `group_join_invitations` for the group. Requires `viewGroupMembers` (not granted for public read without membership).",
  request: { params: groupIdPathSchema },
  responses: {
    200: {
      description: "Distinct user ids (unordered).",
      content: {
        "application/json": { schema: groupMemberUserIdsResponseSchema },
      },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "get",
  path: "/api/groups/{groupId}/members/detail",
  summary: "Group membership detail (roles + pending invites/requests)",
  description:
    "Returns the caller’s role, full member list with roles, pending invitations and non-rejected join requests, and group flags (`groupIsPublic`, `joinRequestsAllowed`). Requires `viewGroupMembers` and an active membership row.",
  request: { params: groupIdPathSchema },
  responses: {
    200: {
      description: "Structured membership for admin UIs.",
      content: {
        "application/json": { schema: groupMembersDetailResponseSchema },
      },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "get",
  path: "/api/groups/{groupId}/invite-crypto-bootstrap",
  summary: "Encrypted group key material for invitation flows (managers)",
  description:
    "Returns ciphertext the caller’s browser unwraps to build `POST …/join-invitations` and `POST …/join-requests/{userId}/accept` bodies. Requires membership with manager role (owner/admin/moderator).",
  request: { params: groupIdPathSchema },
  responses: {
    200: {
      description: "Encrypted keyrings + group public key.",
      content: {
        "application/json": {
          schema: groupInviteCryptoBootstrapResponseSchema,
        },
      },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "get",
  path: "/api/groups/{groupId}/public-keyring",
  summary: "Group public keyring for name encryption",
  description:
    "Returns `groups.public_keyring` when the caller may encrypt a display name for invite accept or join-request flows: active member, pending invitation, or join requests allowed and not yet a member.",
  request: { params: groupIdPathSchema },
  responses: {
    200: {
      description: "Base64 group box public keyring.",
      content: {
        "application/json": {
          schema: groupPublicKeyringResponseSchema,
        },
      },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "get",
  path: "/api/groups/{groupId}/pages",
  summary: "List page IDs in a group",
  description:
    "Replaces legacy `groups.getPages` (authenticated). Optional `lastPageId` cursor for pagination (newest `last_activity_date` first). Omits soft-deleted pages (`permanent_deletion_date` set). Public groups allow `viewGroupPages` without membership.",
  request: {
    params: groupIdPathSchema,
    query: groupPagesListQuerySchema,
  },
  responses: {
    200: {
      description: "Page id window (max 20) and `hasMore`.",
      content: {
        "application/json": {
          schema: groupPagesListResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid `lastPageId` (not in group).",
      content: {
        "application/json": {
          schema: sessionErrorResponseSchema,
        },
      },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/groups/{groupId}/pages",
  summary: "Create a page in a group",
  description:
    "Replaces legacy `pages.create`. For an **existing** group, `parentPageId` must be a page in that group and the caller needs `editGroupPages`. With optional `groupCreation`, path `groupId` is a **new** nanoid (no row yet), `parentPageId` is a page in the user’s **personal** group, and the body includes the same ciphertext as `PageMoveGroupCreationRequest` — Pro only; creates the `groups` + owner `group_members` rows then the first page (legacy parity). The 50 free-page cap applies to non‑Pro users for normal creates.",
  request: {
    params: groupIdPathSchema,
    body: {
      content: {
        "application/json": {
          schema: groupPageCreateRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Page and `users_pages` row created.",
      content: {
        "application/json": {
          schema: groupPageCreateResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid parent page or body.",
      content: {
        "application/json": {
          schema: sessionErrorResponseSchema,
        },
      },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/groups/{groupId}/password",
  summary: "Enable group password (Pro)",
  description:
    "Replaces `groups.password.enable`. Argon2id is applied on the server to the provided `groupPasswordHash` material (base64) and stored encrypted. Requires `editGroupSettings` and a Pro plan.",
  request: {
    params: groupIdPathSchema,
    body: {
      content: {
        "application/json": {
          schema: groupPasswordEnableRequestSchema,
        },
      },
    },
  },
  responses: {
    204: { description: "Password protection enabled." },
    400: {
      description: "Already protected or bad password material.",
      content: {
        "application/json": { schema: sessionErrorResponseSchema },
      },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/groups/{groupId}/password",
  summary: "Change group password (Pro)",
  description: "Replaces `groups.password.change`. Verifies the current group password, then re-wraps the content keyring.",
  request: {
    params: groupIdPathSchema,
    body: {
      content: {
        "application/json": {
          schema: groupPasswordChangeRequestSchema,
        },
      },
    },
  },
  responses: {
    204: { description: "Password updated." },
    400: {
      description: "Wrong password, or group not protected.",
      content: {
        "application/json": { schema: sessionErrorResponseSchema },
      },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/groups/{groupId}/password",
  summary: "Disable group password (not Pro check in legacy for disable-only)",
  description:
    "Replaces `groups.password.disable`. Verifies the current group password, removes server-side group password, updates `groupEncryptedContentKeyring`.",
  request: {
    params: groupIdPathSchema,
    body: {
      content: {
        "application/json": {
          schema: groupPasswordDisableRequestSchema,
        },
      },
    },
  },
  responses: {
    204: { description: "Password protection disabled." },
    400: {
      description: "Wrong password, or not protected.",
      content: {
        "application/json": { schema: sessionErrorResponseSchema },
      },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/groups/{groupId}/privacy/public",
  summary: "Make group public (Pro)",
  description:
    "Replaces `groups.privacy.makePublic`. Sets `access_keyring` and clears member/invite `encrypted_access_keyring`.",
  request: {
    params: groupIdPathSchema,
    body: {
      content: {
        "application/json": {
          schema: groupPrivacyPublicRequestSchema,
        },
      },
    },
  },
  responses: {
    204: { description: "Group is public." },
    400: {
      description: "Already public.",
      content: {
        "application/json": { schema: sessionErrorResponseSchema },
      },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/groups/{groupId}/privacy/join-requests",
  summary: "Allow or reject join requests (Pro)",
  description: "Replaces `groups.privacy.setJoinRequestsAllowed`.",
  request: {
    params: groupIdPathSchema,
    body: {
      content: {
        "application/json": {
          schema: groupPrivacyJoinRequestsPatchSchema,
        },
      },
    },
  },
  responses: {
    204: { description: "Setting updated." },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/groups/{groupId}/privacy/private",
  summary: "Make group private (Pro) — full re-key payload",
  description:
    "Replaces legacy WS `groups.privacy.makePrivate` (step 2 `rotateGroupKeys`) in one request. Clears `access_keyring` when `groupAccessKeyring` is omitted. Member / invitation / request / page record keys must match the DB exactly.",
  request: {
    params: groupIdPathSchema,
    body: {
      content: {
        "application/json": {
          schema: groupPrivacyPrivateRequestSchema,
        },
      },
    },
  },
  responses: {
    204: { description: "Group is private; ciphertext updated." },
    400: {
      description: "Already private or payload key sets do not match group.",
      content: {
        "application/json": { schema: sessionErrorResponseSchema },
      },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/groups/{groupId}",
  summary: "Soft-delete group (grace period)",
  description:
    "Replaces `groups.deletion.delete`. Sets `permanent_deletion_date` ~1 month ahead.",
  request: { params: groupIdPathSchema },
  responses: {
    204: { description: "Deletion scheduled." },
    400: {
      description: "Already soft-deleted.",
      content: {
        "application/json": { schema: sessionErrorResponseSchema },
      },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/groups/{groupId}/restore",
  summary: "Restore a soft-deleted group",
  description:
    "Replaces `groups.deletion.restore` during the grace period (`permanent_deletion_date` in the future).",
  request: { params: groupIdPathSchema },
  responses: {
    204: { description: "Group removed from scheduled deletion." },
    400: {
      description: "Not soft-deleted, or no longer in grace period.",
      content: {
        "application/json": { schema: sessionErrorResponseSchema },
      },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/groups/{groupId}/purge",
  summary: "Permanently mark group deleted (purge active or grace state)",
  description:
    "Replaces `groups.deletion.deletePermanently` — `permanent_deletion_date` set in the past (legacy).",
  request: { params: groupIdPathSchema },
  responses: {
    204: { description: "Purge recorded." },
    400: {
      description: "Already purged.",
      content: {
        "application/json": { schema: sessionErrorResponseSchema },
      },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/groups/{groupId}/join-invitations",
  summary: "Send a group join invitation (Pro)",
  description:
    "Replaces legacy WS `groups.joinInvitations.send` step 1. Deletes a conflicting join request for the invitee. For private groups, `encryptedAccessKeyring` is required; for public groups it is stored as null.",
  request: {
    params: groupIdPathSchema,
    body: {
      content: {
        "application/json": {
          schema: groupJoinInvitationSendRequestSchema,
        },
      },
    },
  },
  responses: {
    204: { description: "Invitation created." },
    400: {
      description: "Already invited, already a member, or missing keyring for private group.",
      content: {
        "application/json": { schema: sessionErrorResponseSchema },
      },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/groups/{groupId}/join-invitations/me/accept",
  summary: "Accept a pending join invitation (Pro)",
  description: "Replaces legacy WS `groups.joinInvitations.accept` step 1.",
  request: {
    params: groupIdPathSchema,
    body: {
      content: {
        "application/json": {
          schema: groupJoinInvitationAcceptRequestSchema,
        },
      },
    },
  },
  responses: {
    204: { description: "Invitation consumed; user added to `group_members`." },
    400: {
      description: "Validation error.",
      content: {
        "application/json": { schema: sessionErrorResponseSchema },
      },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/groups/{groupId}/join-invitations/me/reject",
  summary: "Reject a pending join invitation",
  description: "Replaces legacy WS `groups.joinInvitations.reject` step 1 (no Pro check in legacy).",
  request: { params: groupIdPathSchema },
  responses: {
    204: { description: "Invitation removed." },
    400: {
      description: "No pending invitation.",
      content: {
        "application/json": { schema: sessionErrorResponseSchema },
      },
    },
    401: sessionUnauthorized401,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/groups/{groupId}/join-invitations/{userId}",
  summary: "Cancel a join invitation (Pro)",
  description:
    "Replaces legacy WS `groups.joinInvitations.cancel` step 1. Path `userId` is the invitee. Requires permission to manage the invited role.",
  request: { params: groupUserIdPathSchema },
  responses: {
    204: { description: "Invitation removed." },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/groups/{groupId}/join-requests",
  summary: "Send a join request (Pro)",
  description:
    "Replaces legacy WS `groups.joinRequests.send` step 1. Requires `are_join_requests_allowed` on the group.",
  request: {
    params: groupIdPathSchema,
    body: {
      content: {
        "application/json": {
          schema: groupJoinRequestSendRequestSchema,
        },
      },
    },
  },
  responses: {
    204: { description: "Join request created." },
    400: {
      description: "Already pending.",
      content: {
        "application/json": { schema: sessionErrorResponseSchema },
      },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/groups/{groupId}/join-requests/{userId}/accept",
  summary: "Accept a join request (Pro)",
  description: "Replaces legacy WS `groups.joinRequests.accept` step 1. Path `userId` is the requester.",
  request: {
    params: groupUserIdPathSchema,
    body: {
      content: {
        "application/json": {
          schema: groupJoinRequestAcceptRequestSchema,
        },
      },
    },
  },
  responses: {
    204: { description: "Requester added to `group_members`." },
    400: {
      description: "No pending request or missing access keyring for private group.",
      content: {
        "application/json": { schema: sessionErrorResponseSchema },
      },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/groups/{groupId}/join-requests/{userId}/reject",
  summary: "Reject a join request (Pro)",
  description:
    "Replaces legacy WS `groups.joinRequests.reject` step 1. Sets `rejected` on the request (legacy does not delete the row).",
  request: { params: groupUserIdPathSchema },
  responses: {
    204: { description: "Request marked rejected." },
    400: {
      description: "No pending request.",
      content: {
        "application/json": { schema: sessionErrorResponseSchema },
      },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/groups/{groupId}/join-requests/me/cancel",
  summary: "Cancel own join request (Pro)",
  description: "Replaces legacy WS `groups.joinRequests.cancel` step 1.",
  request: { params: groupIdPathSchema },
  responses: {
    204: { description: "Join request row deleted." },
    400: {
      description: "No pending request.",
      content: {
        "application/json": { schema: sessionErrorResponseSchema },
      },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/groups/{groupId}/members/{userId}",
  summary: "Change a member's role (Pro)",
  description: "Replaces legacy WS `groups.changeUserRole` step 1.",
  request: {
    params: groupUserIdPathSchema,
    body: {
      content: {
        "application/json": {
          schema: groupMemberRolePatchRequestSchema,
        },
      },
    },
  },
  responses: {
    204: { description: "`group_members.role` updated." },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/groups/{groupId}/members/{userId}",
  summary: "Remove a member (or leave)",
  description:
    "Replaces legacy WS `groups.removeUser` step 1. Callers may remove themselves without `canManageRole` on others.",
  request: { params: groupUserIdPathSchema },
  responses: {
    204: { description: "Membership removed." },
    400: {
      description: "Cannot remove the last owner.",
      content: {
        "application/json": { schema: sessionErrorResponseSchema },
      },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/pages/{pageId}/move",
  summary: "Move page (optionally create group, re-key, set main)",
  description:
    "Replaces `websocket/pages/move` — Pro-only; `editGroupSettings` on the page's current group, `editGroupPages` on destination unless `groupCreation` creates it. `reencrypt` is required when the page changes group (Yjs `page_updates` replaced with a single index-0 row; snapshots updated by id).",
  request: {
    params: pageIdPathSchema,
    body: {
      content: {
        "application/json": {
          schema: pageMoveRequestSchema,
        },
      },
    },
  },
  responses: {
    204: { description: "Move completed." },
    400: {
      description: "No-op move, or invalid payload.",
      content: { "application/json": { schema: sessionErrorResponseSchema } },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/pages/{pageId}/bump",
  summary: "Bump page (recents, activity, optional breadcrumb parent)",
  description: "Replaces `pages.bump` — `users` starting + recents, optional `users_pages.last_parent_id` when the parent chain ends at the personal main page (`lastParentId` walk).",
  request: {
    params: pageIdPathSchema,
    body: {
      content: {
        "application/json": {
          schema: pageBumpRequestSchema,
        },
      },
    },
  },
  responses: {
    204: { description: "Bumped (best-effort; loop in chain exits without updating parent)." },
    400: {
      description: "Invalid parent (chain does not resolve to main page).",
      content: { "application/json": { schema: sessionErrorResponseSchema } },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "get",
  path: "/api/pages/{pageId}/collab-updates",
  summary: "List encrypted Yjs page updates (Postgres)",
  description:
    "Bootstrap for the editor: returns all `page_updates` rows for the page, ordered by `index`. Does not use legacy Redis collab cache — Postgres only. Full duplex collab remains a separate WebSocket track (Phase 3).",
  request: { params: pageIdPathSchema },
  responses: {
    200: {
      description: "Current ciphertext chain.",
      content: {
        "application/json": { schema: pageCollabUpdatesGetResponseSchema },
      },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/pages/{pageId}/collab-updates",
  summary: "Append page updates (optimistic concurrency)",
  description:
    "Appends ciphertext rows to `page_updates`. `expectedLastIndex` must match the current max index (or null when empty). **409** when another writer advanced the chain — client should re-GET and retry.",
  request: {
    params: pageIdPathSchema,
    body: {
      content: {
        "application/json": {
          schema: pageCollabUpdatesAppendRequestSchema,
        },
      },
    },
  },
  responses: {
    204: { description: "Updates persisted." },
    400: {
      description: "Bad index sequence or wrong `expectedLastIndex` for an empty page.",
      content: { "application/json": { schema: sessionErrorResponseSchema } },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    409: {
      description: "Stale `expectedLastIndex` (concurrent append).",
      content: { "application/json": { schema: sessionErrorResponseSchema } },
    },
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/pages/{pageId}/backlinks",
  summary: "Create page backlink (source → this page as target)",
  description:
    "Replaces `pages.backlinks.create`. Path `pageId` is the **target**; body has `sourcePageId`.",
  request: {
    params: pageIdPathSchema,
    body: {
      content: {
        "application/json": {
          schema: pageBacklinkCreateRequestSchema,
        },
      },
    },
  },
  responses: {
    204: { description: "Backlink created or activity updated (upsert)." },
    400: {
      description: "Source and target identical.",
      content: { "application/json": { schema: sessionErrorResponseSchema } },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/pages/{pageId}/backlinks/{targetPageId}",
  summary: "Delete backlink from source page to target page",
  description:
    "Replaces `pages.backlinks.delete`. Path `pageId` is **source**; `targetPageId` is the link target (legacy input names).",
  request: { params: pageTargetPagePathSchema },
  responses: {
    204: { description: "Backlink removed." },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/pages/{pageId}/snapshots",
  summary: "Save encrypted page snapshot (Pro)",
  description: "Replaces `pages.snapshots.save` — asserts Pro plan (legacy `assertUserSubscribed`).",
  request: {
    params: pageIdPathSchema,
    body: {
      content: {
        "application/json": {
          schema: pageSnapshotSaveRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Snapshot id",
      content: {
        "application/json": { schema: pageSnapshotCreateResponseSchema },
      },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "get",
  path: "/api/pages/{pageId}/snapshots/{snapshotId}",
  summary: "Load page snapshot ciphertext (Pro)",
  request: { params: pageSnapshotPathSchema },
  responses: {
    200: {
      description: "Ciphertext (base64 fields).",
      content: {
        "application/json": { schema: pageSnapshotLoadResponseSchema },
      },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/pages/{pageId}/snapshots/{snapshotId}",
  summary: "Delete a page snapshot",
  request: { params: pageSnapshotPathSchema },
  responses: {
    204: { description: "Snapshot removed." },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/pages/{pageId}",
  summary: "Soft-delete page (grace period)",
  request: { params: pageIdPathSchema },
  responses: {
    204: { description: "Deletion scheduled (not main page)." },
    400: {
      description: "Already deleted, or is group main page.",
      content: { "application/json": { schema: sessionErrorResponseSchema } },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/pages/{pageId}/restore",
  summary: "Restore a soft-deleted page",
  request: { params: pageIdPathSchema },
  responses: {
    204: { description: "Page restored in grace." },
    400: {
      description: "Not deleted, or free page past purge date.",
      content: { "application/json": { schema: sessionErrorResponseSchema } },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/pages/{pageId}/purge",
  summary: "Permanently mark page deleted; refunds free page when applicable",
  request: { params: pageIdPathSchema },
  responses: {
    204: { description: "Purge recorded." },
    400: {
      description: "Is main page, or already purged.",
      content: { "application/json": { schema: sessionErrorResponseSchema } },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/users/me/password",
  summary: "Change password (re-wrap keyrings)",
  description:
    "Replaces legacy WebSocket `users.account.changePassword`. Requires `accessToken`; verifies `oldLoginHash`; stores keyrings encrypted with the new password (`userEncrypted*` are plaintext keyrings from the client, same as registration). Invalidates all sessions and clears cookies — client must log in again.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: userPasswordChangeRequestSchema,
        },
      },
    },
  },
  responses: {
    204: {
      description:
        "Password updated; all sessions invalidated; session cookies cleared.",
    },
    400: {
      description: "Wrong current password or invalid key material.",
      content: {
        "application/json": {
          schema: sessionErrorResponseSchema,
        },
      },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/users/me/email-change",
  summary: "Request account email change (6-digit code email)",
  description:
    "Replaces legacy `users.account.emailChange.request`. Verifies `oldLoginHash` and that the new address is not already registered. When outbound email is enabled, sends a 6-digit code. When `SEND_EMAILS=false` (e.g. local), returns 200 with `emailVerificationCode` instead of emailing.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: userEmailChangeRequestSchema,
        },
      },
    },
  },
  responses: {
    204: {
      description: "Code emailed to the new address; pending change stored on the user row.",
    },
    200: {
      description:
        "Out-of-band dev response when `SEND_EMAILS=false` (verification code not emailed).",
      content: {
        "application/json": {
          schema: userEmailChangeRequestResponseSchema,
        },
      },
    },
    400: {
      description: "Wrong password, address in use, or validation error.",
      content: {
        "application/json": {
          schema: sessionErrorResponseSchema,
        },
      },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    502: {
      description: "Email send failed (e.g. Resend) after the pending state was written.",
      content: {
        "application/json": {
          schema: sessionErrorResponseSchema,
        },
      },
    },
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/users/me/email-change/confirm",
  summary: "Confirm email change (re-wrap keyrings, new password)",
  description:
    "Replaces legacy WebSocket `users.account.emailChange.finish` (step 1 + 2 in one). Verifies 6-digit code and `oldLoginHash`, then applies new email + new password-encrypted keyrings, invalidates sessions, clears cookies; optional Stripe customer email update in the deployment (not in OpenAPI).",
  request: {
    body: {
      content: {
        "application/json": {
          schema: userEmailChangeConfirmRequestSchema,
        },
      },
    },
  },
  responses: {
    204: {
      description: "Email updated; sessions cleared; re-login required.",
    },
    400: {
      description: "Wrong code, wrong password, no pending change, or invalid keyrings.",
      content: {
        "application/json": {
          schema: sessionErrorResponseSchema,
        },
      },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/users/me",
  summary: "Delete current account (password confirmation)",
  description:
    "Replaces legacy `users.account.delete`. Requires `accessToken` cookie and correct `loginHash` in the JSON body. Clears session cookies on success. Optional Stripe customer deletion is handled by the deployment (not part of OpenAPI).",
  request: {
    body: {
      content: {
        "application/json": {
          schema: userAccountDeleteRequestSchema,
        },
      },
    },
  },
  responses: {
    204: {
      description:
        "Account removed; session cookies cleared (same names as login).",
    },
    400: {
      description: "Wrong password, ownership constraint, or validation error.",
      content: {
        "application/json": {
          schema: sessionErrorResponseSchema,
        },
      },
    },
    401: sessionUnauthorized401,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/users/me/2fa/enable/request",
  summary: "Start 2FA setup (TOTP secret + otpauth URI)",
  description:
    "Replaces `users.account.twoFactorAuth.enable.request`. Stores a pending encrypted authenticator secret; client shows QR from `keyUri` or `secret`.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: user2faPasswordBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Secret generated; not yet enabled until `…/enable/finish`.",
      content: {
        "application/json": {
          schema: user2faEnableRequestResponseSchema,
        },
      },
    },
    400: {
      description: "Validation error, or 2FA already fully enabled.",
      content: {
        "application/json": {
          schema: sessionErrorResponseSchema,
        },
      },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/users/me/2fa/enable/finish",
  summary: "Complete 2FA setup (TOTP + recovery codes)",
  description: "Replaces `users.account.twoFactorAuth.enable.finish`.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: user2faEnableFinishRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "2FA enabled; one-time recovery codes returned.",
      content: {
        "application/json": {
          schema: user2faRecoveryCodesResponseSchema,
        },
      },
    },
    400: {
      description: "Wrong password, wrong TOTP, or already enabled.",
      content: {
        "application/json": {
          schema: sessionErrorResponseSchema,
        },
      },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/users/me/2fa/load",
  summary: "Reveal TOTP secret and otpauth URI (after password check)",
  description:
    "Replaces `users.account.twoFactorAuth.load` (legacy tRPC had `loginHash` in the query; this API uses a JSON body on POST to avoid putting secrets in query strings or logs).",
  request: {
    body: {
      content: {
        "application/json": {
          schema: user2faPasswordBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Secret and `keyUri` for re-provisioning an authenticator.",
      content: {
        "application/json": {
          schema: user2faEnableRequestResponseSchema,
        },
      },
    },
    400: {
      description: "Wrong password or 2FA not enabled.",
      content: {
        "application/json": {
          schema: sessionErrorResponseSchema,
        },
      },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/users/me/2fa/recovery-codes",
  summary: "Regenerate recovery codes",
  description: "Replaces `users.account.twoFactorAuth.generateRecoveryCodes`.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: user2faPasswordBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "New recovery codes (previous codes invalidated).",
      content: {
        "application/json": {
          schema: user2faRecoveryCodesResponseSchema,
        },
      },
    },
    400: {
      description: "Wrong password or 2FA not enabled.",
      content: {
        "application/json": {
          schema: sessionErrorResponseSchema,
        },
      },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/users/me/2fa/devices/forget",
  summary: "Mark all user devices as not trusted",
  description: "Replaces `users.account.twoFactorAuth.forgetTrustedDevices`.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: user2faPasswordBodySchema,
        },
      },
    },
  },
  responses: {
    204: {
      description: "`devices.trusted` cleared for this user.",
    },
    400: {
      description: "Wrong password or 2FA not enabled.",
      content: {
        "application/json": {
          schema: sessionErrorResponseSchema,
        },
      },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/users/me/2fa/disable",
  summary: "Disable 2FA",
  description: "Replaces `users.account.twoFactorAuth.disable`.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: user2faPasswordBodySchema,
        },
      },
    },
  },
  responses: {
    204: {
      description: "2FA disabled; authenticator and recovery material cleared.",
    },
    400: {
      description: "Wrong password or 2FA not enabled.",
      content: {
        "application/json": {
          schema: sessionErrorResponseSchema,
        },
      },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/users/email-verification/resend",
  summary: "Resend email verification (public, by email)",
  description:
    "Replaces legacy `users.account.resendVerificationEmail`. Uses Resend when `SEND_EMAILS` is not `false`.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: emailVerificationResendRequestSchema,
        },
      },
    },
  },
  responses: {
    204: {
      description: "Email sent (or accepted by provider).",
    },
    400: {
      description: "Validation error or outbound email disabled for this environment.",
      content: {
        "application/json": {
          schema: sessionErrorResponseSchema,
        },
      },
    },
    404: sessionNotFound404,
    409: sessionConflict409,
    502: {
      description: "Email provider (Resend) request failed.",
      content: {
        "application/json": {
          schema: sessionErrorResponseSchema,
        },
      },
    },
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/users/email-verification/confirm",
  summary: "Confirm email with nanoid code",
  description: "Replaces legacy `users.account.verifyEmail` (public).",
  request: {
    body: {
      content: {
        "application/json": {
          schema: emailVerificationConfirmRequestSchema,
        },
      },
    },
  },
  responses: {
    204: {
      description: "Email verified; account updated.",
    },
    400: {
      description: "Invalid or expired code.",
      content: {
        "application/json": {
          schema: sessionErrorResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/sessions/refresh",
  summary: "Rotate access token using refresh cookie",
  description: "Replaces legacy `sessions.refresh`.",
  responses: {
    200: {
      description: "New session key and cookies.",
      content: {
        "application/json": {
          schema: sessionRefreshSuccessSchema,
        },
      },
    },
    401: sessionUnauthorized401,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/sessions/logout",
  summary: "Invalidate session and clear cookies",
  description: "Replaces legacy `sessions.logout`.",
  responses: {
    204: {
      description: "Logged out (cookies cleared).",
    },
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/sessions/demo",
  summary: "Create demo user and session",
  description:
    "Replaces legacy `sessions.startDemo`. Request body will match registration key material once defined.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: sessionDemoRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Demo user created; same response shape as login.",
      content: {
        "application/json": {
          schema: sessionLoginSuccessSchema,
        },
      },
    },
    400: {
      description: "Validation error (e.g. unsupported group password on demo).",
      content: {
        "application/json": {
          schema: sessionErrorResponseSchema,
        },
      },
    },
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/billing/stripe/checkout-session",
  summary: "Create Stripe Checkout (subscription) session",
  description:
    "Replaces legacy `users.account.stripe.createCheckoutSession`. Resolves or creates a Stripe customer from `users.customer_id` and decrypted account email, then returns a hosted Checkout URL. Requires verified email. Demo accounts receive **403**.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: stripeCheckoutSessionRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Checkout session URL (hosted Stripe page).",
      content: {
        "application/json": {
          schema: stripeCheckoutSessionResponseSchema,
        },
      },
    },
    400: {
      description: "Already subscribed, or validation error.",
      content: { "application/json": { schema: sessionErrorResponseSchema } },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/billing/stripe/portal-session",
  summary: "Create Stripe Customer Portal session",
  description:
    "Replaces legacy `users.account.stripe.createPortalSession`. Requires a `users.customer_id` (create checkout first or migrate from legacy).",
  responses: {
    200: {
      description: "Portal session URL.",
      content: {
        "application/json": {
          schema: stripePortalSessionResponseSchema,
        },
      },
    },
    400: {
      description: "No Stripe customer on file.",
      content: { "application/json": { schema: sessionErrorResponseSchema } },
    },
    401: sessionUnauthorized401,
    403: sessionForbidden403,
    404: sessionNotFound404,
    503: sessionServiceUnavailable503,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/webhooks/stripe",
  summary: "Stripe webhooks (signed raw body)",
  description:
    "Replaces the legacy Fastify `POST /stripe/webhook` handler. Send the **raw** request body; verification uses the `Stripe-Signature` header and `STRIPE_WEBHOOK_SECRET`. Handles `customer.subscription.updated` and `customer.subscription.deleted` by updating `users.plan` and `users.subscription_id` via `users.customer_id`.",
  responses: {
    200: { description: "Event acknowledged." },
    400: {
      description: "Missing or invalid signature.",
      content: { "application/json": { schema: sessionErrorResponseSchema } },
    },
    503: sessionServiceUnavailable503,
  },
});

const generator = new OpenApiGeneratorV3(registry.definitions);

export function getOpenApiDocument(): OpenAPIObject {
  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "DeepNotes API",
      version: "0.0.0",
      description:
        "Greenfield HTTP API (REST + OpenAPI). Legacy /trpc is not a compatibility target.",
    },
    servers: [{ url: "/" }],
  });
}
