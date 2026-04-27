import {
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import type { OpenAPIObject } from "openapi3-ts/oas30";

import { notImplementedResponseSchema } from "./schemas/errors.js";
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
} from "./schemas/sessions.js";

const registry = new OpenAPIRegistry();

const sessionNotImplemented501 = {
  description:
    "Demo registration is not implemented on this route yet (Phase 3+).",
  content: {
    "application/json": {
      schema: notImplementedResponseSchema,
    },
  },
} as const;

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
    503: sessionServiceUnavailable503,
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
    501: sessionNotImplemented501,
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
