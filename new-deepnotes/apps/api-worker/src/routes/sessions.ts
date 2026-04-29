import type { ContentfulStatusCode } from "hono/utils/http-status";
import { sessionDemoRequestSchema, sessionLoginRequestSchema } from "@deepnotes/api";

import type { ApiHono } from "../api-hono.js";
import { readCookieHeader } from "../cookies.js";
import { getDbForConnectionString } from "../db-pool.js";
import { appendSetCookies, serviceUnavailableBody } from "../http-helpers.js";
import { getSessionRedisPort } from "../redis-port.js";
import { getSessionEnv } from "../session-env.js";

export function registerSessionRoutes(app: ApiHono): void {
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
  const redis = getSessionRedisPort(c.env);

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
      redis,
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

app.post("/api/sessions/demo", async (c) => {
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

  const parsed = sessionDemoRequestSchema.safeParse(bodyJson);
  if (!parsed.success) {
    return c.json(
      {
        code: "VALIDATION_ERROR",
        message: parsed.error.flatten().formErrors.join("; "),
      },
      400,
    );
  }

  const db = getDbForConnectionString(hyper.connectionString);

  try {
    const { performSessionStartDemo } = await import("@deepnotes/session");
    const { json, cookieLines } = await performSessionStartDemo({
      db,
      env: sessionEnv,
      body: parsed.data,
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
}
