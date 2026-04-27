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
  emailVerificationConfirmRequestSchema,
  emailVerificationResendRequestSchema,
  userAccountDeleteRequestSchema,
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
