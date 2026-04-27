import {
  getOpenApiDocument,
  healthResponseSchema,
  sessionLoginRequestSchema,
} from "@deepnotes/api";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { Hono } from "hono";

import { getDbForConnectionString } from "./db-pool.js";
import { readCookieHeader } from "./cookies.js";
import { getSessionEnv, type WorkerSessionBindings } from "./session-env.js";

type Bindings = WorkerSessionBindings & {
  /** Wired in `wrangler.toml`; optional in unit tests that do not pass `env`. */
  HYPERDRIVE?: Hyperdrive;
};

const app = new Hono<{ Bindings: Bindings }>();

const sessionNotImplementedBody = {
  code: "NOT_IMPLEMENTED" as const,
  message:
    "Demo registration is not implemented yet. See OpenAPI for the contract.",
};

const serviceUnavailableBody = {
  code: "SERVICE_UNAVAILABLE" as const,
  message:
    "Session routes require ACCESS_SECRET, REFRESH_SECRET, USER_EMAIL_SECRET, USER_REHASHED_LOGIN_HASH_ENCRYPTION_KEY, USER_AUTHENTICATOR_SECRET_ENCRYPTION_KEY, and USER_RECOVERY_CODES_ENCRYPTION_KEY (e.g. Wrangler secrets / .dev.vars).",
};

function appendSetCookies(res: Response, lines: string[]): void {
  for (const line of lines) {
    res.headers.append("Set-Cookie", line);
  }
}

app.get("/api/openapi.json", (c) => c.json(getOpenApiDocument()));

app.get("/api/health", (c) => {
  const body = { status: "ok" as const, service: "deepnotes-api-worker" };
  const parsed = healthResponseSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ status: "error" }, 500);
  }
  return c.json(parsed.data);
});

app.post("/api/sessions/login", async (c) => {
  const sessionEnv = getSessionEnv(c.env);
  if (sessionEnv == null) {
    return c.json(serviceUnavailableBody, 503);
  }
  const hyper = c.env.HYPERDRIVE;
  if (hyper == null) {
    return c.json(
      {
        code: "SERVICE_UNAVAILABLE" as const,
        message: "HYPERDRIVE binding is not configured.",
      },
      503,
    );
  }

  let bodyJson: unknown;
  try {
    bodyJson = await c.req.json();
  } catch {
    return c.json({ code: "BAD_REQUEST", message: "Expected JSON body." }, 400);
  }

  const parsed = sessionLoginRequestSchema.safeParse(bodyJson);
  if (!parsed.success) {
    return c.json(
      {
        code: "VALIDATION_ERROR",
        message: parsed.error.flatten().formErrors.join("; "),
      },
      400,
    );
  }

  let loginHash: Uint8Array;
  try {
    loginHash = new Uint8Array(
      Buffer.from(parsed.data.loginHash, "base64"),
    );
  } catch {
    return c.json(
      { code: "VALIDATION_ERROR", message: "loginHash must be valid base64." },
      400,
    );
  }

  const db = getDbForConnectionString(hyper.connectionString);

  try {
    const { performSessionLogin } = await import("@deepnotes/session");
    const { json, cookieLines } = await performSessionLogin({
      db,
      env: sessionEnv,
      body: {
        email: parsed.data.email,
        loginHash,
        rememberSession: parsed.data.rememberSession,
        authenticatorToken: parsed.data.authenticatorToken,
        rememberDevice: parsed.data.rememberDevice,
        recoveryCode: parsed.data.recoveryCode,
      },
      clientIp: c.req.header("CF-Connecting-IP") ?? "127.0.0.1",
      userAgent: c.req.header("User-Agent") ?? "",
    });
    const res = c.json(json, 200);
    appendSetCookies(res, cookieLines);
    return res;
  } catch (e) {
    const { SessionError } = await import("@deepnotes/session");
    if (e instanceof SessionError) {
      return c.json(
        { code: e.code, message: e.message },
        e.status as ContentfulStatusCode,
      );
    }
    throw e;
  }
});

app.post("/api/sessions/refresh", async (c) => {
  const sessionEnv = getSessionEnv(c.env);
  if (sessionEnv == null) {
    return c.json(serviceUnavailableBody, 503);
  }
  const hyper = c.env.HYPERDRIVE;
  if (hyper == null) {
    return c.json(
      {
        code: "SERVICE_UNAVAILABLE" as const,
        message: "HYPERDRIVE binding is not configured.",
      },
      503,
    );
  }

  const db = getDbForConnectionString(hyper.connectionString);
  const cookieHeader = c.req.header("Cookie");

  try {
    const { performSessionRefresh } = await import("@deepnotes/session");
    const { json, cookieLines } = await performSessionRefresh({
      db,
      env: sessionEnv,
      refreshCookie: readCookieHeader(cookieHeader, "refreshToken"),
      loggedInCookie: readCookieHeader(cookieHeader, "loggedIn"),
    });
    const res = c.json(json, 200);
    appendSetCookies(res, cookieLines);
    return res;
  } catch (e) {
    const { SessionError } = await import("@deepnotes/session");
    if (e instanceof SessionError) {
      return c.json(
        { code: e.code, message: e.message },
        e.status as ContentfulStatusCode,
      );
    }
    throw e;
  }
});

app.post("/api/sessions/logout", async (c) => {
  const sessionEnv = getSessionEnv(c.env);
  if (sessionEnv == null) {
    return c.json(serviceUnavailableBody, 503);
  }
  const hyper = c.env.HYPERDRIVE;
  if (hyper == null) {
    return c.json(
      {
        code: "SERVICE_UNAVAILABLE" as const,
        message: "HYPERDRIVE binding is not configured.",
      },
      503,
    );
  }

  const db = getDbForConnectionString(hyper.connectionString);
  const cookieHeader = c.req.header("Cookie");

  const { performSessionLogout } = await import("@deepnotes/session");
  const { cookieLines } = await performSessionLogout({
    db,
    env: sessionEnv,
    accessCookie: readCookieHeader(cookieHeader, "accessToken"),
  });

  const res = c.body(null, 204);
  appendSetCookies(res, cookieLines);
  return res;
});

app.post("/api/sessions/demo", (c) =>
  c.json(sessionNotImplementedBody, 501),
);

export default app;
