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
  groupPageCreateRequestSchema,
  groupPageCreateResponseSchema,
  groupPagesListQuerySchema,
  groupPagesListResponseSchema,
  userGroupIdsResponseSchema,
} from "./schemas/pages-groups.js";
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
  userMeResponseSchema,
  userPasswordChangeRequestSchema,
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
    "Replaces legacy `pages.create` for an existing group (optional `groupCreation` path not yet exposed). Enforces `editGroupPages`, Pro subscription when `groupId` is not the user’s personal group, and the 50 free-page cap for non‑Pro users.",
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
