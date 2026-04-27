import {
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import type { OpenAPIObject } from "openapi3-ts/oas30";

import { notImplementedResponseSchema } from "./schemas/errors.js";
import { healthResponseSchema } from "./schemas/health.js";
import {
  sessionDemoRequestSchema,
  sessionLoginRequestSchema,
} from "./schemas/sessions.js";

const registry = new OpenAPIRegistry();

const sessionNotImplemented501 = {
  description:
    "Not implemented yet; path and schemas are stable for codegen (Phase 3).",
  content: {
    "application/json": {
      schema: notImplementedResponseSchema,
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
    501: sessionNotImplemented501,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/sessions/refresh",
  summary: "Rotate access token using refresh cookie",
  description: "Replaces legacy `sessions.refresh`.",
  responses: {
    501: sessionNotImplemented501,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/sessions/logout",
  summary: "Invalidate session and clear cookies",
  description: "Replaces legacy `sessions.logout`.",
  responses: {
    501: sessionNotImplemented501,
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
