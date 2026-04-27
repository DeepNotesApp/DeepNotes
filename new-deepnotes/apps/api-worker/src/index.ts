import {
  emailVerificationConfirmRequestSchema,
  emailVerificationResendRequestSchema,
  getOpenApiDocument,
  groupPageCreateRequestSchema,
  groupPagesListQuerySchema,
  healthResponseSchema,
  userDefaultArrowPatchSchema,
  userDefaultNotePatchSchema,
  userNotificationsQuerySchema,
  userPageIdsBodySchema,
  userPagesPathQuerySchema,
  sessionDemoRequestSchema,
  sessionLoginRequestSchema,
  userAccountDeleteRequestSchema,
  userEmailChangeConfirmRequestSchema,
  user2faEnableFinishRequestSchema,
  user2faPasswordBodySchema,
  userEmailChangeRequestSchema,
  userPasswordChangeRequestSchema,
  userRegisterRequestSchema,
} from "@deepnotes/api";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { Hono } from "hono";

import { getDbForConnectionString } from "./db-pool.js";
import { readCookieHeader } from "./cookies.js";
import { getSessionRedisPort } from "./redis-port.js";
import { getSessionEnv, type WorkerSessionBindings } from "./session-env.js";

type Bindings = WorkerSessionBindings & {
  /** Wired in `wrangler.toml`; optional in unit tests that do not pass `env`. */
  HYPERDRIVE?: Hyperdrive;
};

const app = new Hono<{ Bindings: Bindings }>();

const serviceUnavailableBody = {
  code: "SERVICE_UNAVAILABLE" as const,
  message:
    "Session routes require ACCESS_SECRET, REFRESH_SECRET, USER_EMAIL_SECRET, USER_EMAIL_ENCRYPTION_KEY, USER_REHASHED_LOGIN_HASH_ENCRYPTION_KEY, USER_AUTHENTICATOR_SECRET_ENCRYPTION_KEY, and USER_RECOVERY_CODES_ENCRYPTION_KEY (e.g. Wrangler secrets / .dev.vars).",
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

app.post("/api/users", async (c) => {
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

  const parsed = userRegisterRequestSchema.safeParse(bodyJson);
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
    const { performUserRegister } = await import("@deepnotes/session");
    const result = await performUserRegister({
      db,
      env: sessionEnv,
      body: {
        email: parsed.data.email,
        loginHash: parsed.data.loginHash,
        userId: parsed.data.userId,
        groupId: parsed.data.groupId,
        pageId: parsed.data.pageId,
        userPublicKeyring: parsed.data.userPublicKeyring,
        userEncryptedPrivateKeyring: parsed.data.userEncryptedPrivateKeyring,
        userEncryptedSymmetricKeyring: parsed.data.userEncryptedSymmetricKeyring,
        userEncryptedName: parsed.data.userEncryptedName,
        userEncryptedDefaultNote: parsed.data.userEncryptedDefaultNote,
        userEncryptedDefaultArrow: parsed.data.userEncryptedDefaultArrow,
        groupCreation: parsed.data.groupCreation,
        pageCreation: parsed.data.pageCreation,
      },
    });
    return c.json(result, 201);
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

app.post("/api/users/me/password", async (c) => {
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

  const parsed = userPasswordChangeRequestSchema.safeParse(bodyJson);
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
  const cookieHeader = c.req.header("Cookie");

  try {
    const { performUserPasswordChange } = await import("@deepnotes/session");
    const { cookieLines } = await performUserPasswordChange({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      oldLoginHash: parsed.data.oldLoginHash,
      newLoginHash: parsed.data.newLoginHash,
      newEncryptedPrivateKeyring: parsed.data.userEncryptedPrivateKeyring,
      newEncryptedSymmetricKeyring: parsed.data.userEncryptedSymmetricKeyring,
    });
    const res = c.body(null, 204);
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

app.post("/api/users/me/email-change", async (c) => {
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

  const parsed = userEmailChangeRequestSchema.safeParse(bodyJson);
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
  const cookieHeader = c.req.header("Cookie");

  try {
    const { performUserEmailChangeRequest } = await import("@deepnotes/session");
    const out = await performUserEmailChangeRequest({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      oldLoginHash: parsed.data.oldLoginHash,
      newEmail: parsed.data.newEmail,
    });
    if (out.devEmailVerificationCode != null) {
      return c.json(
        { emailVerificationCode: out.devEmailVerificationCode },
        200,
      );
    }
    return c.body(null, 204);
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

app.post("/api/users/me/email-change/confirm", async (c) => {
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

  const parsed = userEmailChangeConfirmRequestSchema.safeParse(bodyJson);
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
  const cookieHeader = c.req.header("Cookie");

  try {
    const { performUserEmailChangeConfirm } = await import("@deepnotes/session");
    const { cookieLines } = await performUserEmailChangeConfirm({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      oldLoginHash: parsed.data.oldLoginHash,
      emailVerificationCode: parsed.data.emailVerificationCode,
      newLoginHash: parsed.data.newLoginHash,
      newEncryptedPrivateKeyring: parsed.data.userEncryptedPrivateKeyring,
      newEncryptedSymmetricKeyring: parsed.data.userEncryptedSymmetricKeyring,
    });
    const res = c.body(null, 204);
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

app.delete("/api/users/me", async (c) => {
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

  const parsed = userAccountDeleteRequestSchema.safeParse(bodyJson);
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
  const cookieHeader = c.req.header("Cookie");

  try {
    const { performUserAccountDelete } = await import("@deepnotes/session");
    const { cookieLines } = await performUserAccountDelete({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      loginHash,
    });
    const res = c.body(null, 204);
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

app.get("/api/users/me/groups", async (c) => {
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
    const { performGetUserGroupIds } = await import("@deepnotes/session");
    const out = await performGetUserGroupIds({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
    });
    return c.json(out, 200);
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

app.get("/api/users/me/pages/starting", async (c) => {
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
    const { performGetStartingPageId } = await import("@deepnotes/session");
    const out = await performGetStartingPageId({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
    });
    return c.json(out, 200);
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

app.get("/api/users/me/pages/path", async (c) => {
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
  const qParsed = userPagesPathQuerySchema.safeParse({
    initialPageId: c.req.query("initialPageId") ?? undefined,
  });
  if (!qParsed.success) {
    return c.json(
      {
        code: "VALIDATION_ERROR",
        message: qParsed.error.flatten().formErrors.join("; "),
      },
      400,
    );
  }
  const db = getDbForConnectionString(hyper.connectionString);
  const cookieHeader = c.req.header("Cookie");
  try {
    const { performGetCurrentPath } = await import("@deepnotes/session");
    const out = await performGetCurrentPath({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      initialPageId: qParsed.data.initialPageId,
    });
    return c.json(out, 200);
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

app.post("/api/users/me/pages/recent/remove", async (c) => {
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
  const parsed = userPageIdsBodySchema.safeParse(bodyJson);
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
  const cookieHeader = c.req.header("Cookie");
  try {
    const { performRemoveRecentPages } = await import("@deepnotes/session");
    await performRemoveRecentPages({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      pageIds: parsed.data.pageIds,
    });
    return c.body(null, 204);
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

app.post("/api/users/me/pages/recent/clear", async (c) => {
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
    const { performClearRecentPages } = await import("@deepnotes/session");
    await performClearRecentPages({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
    });
    return c.body(null, 204);
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

app.post("/api/users/me/pages/favorites", async (c) => {
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
  const parsed = userPageIdsBodySchema.safeParse(bodyJson);
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
  const cookieHeader = c.req.header("Cookie");
  try {
    const { performAddFavoritePages } = await import("@deepnotes/session");
    await performAddFavoritePages({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      pageIds: parsed.data.pageIds,
    });
    return c.body(null, 204);
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

app.post("/api/users/me/pages/favorites/remove", async (c) => {
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
  const parsed = userPageIdsBodySchema.safeParse(bodyJson);
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
  const cookieHeader = c.req.header("Cookie");
  try {
    const { performRemoveFavoritePages } = await import("@deepnotes/session");
    await performRemoveFavoritePages({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      pageIds: parsed.data.pageIds,
    });
    return c.body(null, 204);
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

app.post("/api/users/me/pages/favorites/clear", async (c) => {
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
    const { performClearFavoritePages } = await import("@deepnotes/session");
    await performClearFavoritePages({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
    });
    return c.body(null, 204);
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

app.patch("/api/users/me/defaults/note", async (c) => {
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
  const parsed = userDefaultNotePatchSchema.safeParse(bodyJson);
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
  const cookieHeader = c.req.header("Cookie");
  try {
    const { performPatchDefaultNote } = await import("@deepnotes/session");
    await performPatchDefaultNote({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      userEncryptedDefaultNote: parsed.data.userEncryptedDefaultNote,
    });
    return c.body(null, 204);
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

app.patch("/api/users/me/defaults/arrow", async (c) => {
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
  const parsed = userDefaultArrowPatchSchema.safeParse(bodyJson);
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
  const cookieHeader = c.req.header("Cookie");
  try {
    const { performPatchDefaultArrow } = await import("@deepnotes/session");
    await performPatchDefaultArrow({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      userEncryptedDefaultArrow: parsed.data.userEncryptedDefaultArrow,
    });
    return c.body(null, 204);
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

app.get("/api/users/me/notifications", async (c) => {
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
  const qParsed = userNotificationsQuerySchema.safeParse({
    lastNotificationId: c.req.query("lastNotificationId") ?? undefined,
  });
  if (!qParsed.success) {
    return c.json(
      {
        code: "VALIDATION_ERROR",
        message: qParsed.error.flatten().formErrors.join("; "),
      },
      400,
    );
  }
  const db = getDbForConnectionString(hyper.connectionString);
  const cookieHeader = c.req.header("Cookie");
  try {
    const { performLoadNotifications } = await import("@deepnotes/session");
    const out = await performLoadNotifications({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      lastNotificationId: qParsed.data.lastNotificationId,
    });
    return c.json(out, 200);
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

app.post("/api/users/me/notifications/read", async (c) => {
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
    const { performMarkNotificationsRead } = await import("@deepnotes/session");
    await performMarkNotificationsRead({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
    });
    return c.body(null, 204);
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

app.get("/api/groups/:groupId/main-page", async (c) => {
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
  const groupId = c.req.param("groupId");

  try {
    const { performGetGroupMainPageId } = await import("@deepnotes/session");
    const out = await performGetGroupMainPageId({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      groupId,
    });
    return c.json(out, 200);
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

app.get("/api/groups/:groupId/members", async (c) => {
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
  const groupId = c.req.param("groupId");

  try {
    const { performGetGroupMemberUserIds } = await import("@deepnotes/session");
    const out = await performGetGroupMemberUserIds({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      groupId,
    });
    return c.json(out, 200);
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

app.get("/api/groups/:groupId/pages", async (c) => {
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

  const groupId = c.req.param("groupId");
  const qParsed = groupPagesListQuerySchema.safeParse({
    lastPageId: c.req.query("lastPageId") ?? undefined,
  });
  if (!qParsed.success) {
    return c.json(
      {
        code: "VALIDATION_ERROR",
        message: qParsed.error.flatten().formErrors.join("; "),
      },
      400,
    );
  }

  const db = getDbForConnectionString(hyper.connectionString);
  const cookieHeader = c.req.header("Cookie");

  try {
    const { performListGroupPages } = await import("@deepnotes/session");
    const out = await performListGroupPages({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      groupId,
      lastPageId: qParsed.data.lastPageId,
    });
    return c.json(out, 200);
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

app.post("/api/groups/:groupId/pages", async (c) => {
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

  const parsed = groupPageCreateRequestSchema.safeParse(bodyJson);
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
  const cookieHeader = c.req.header("Cookie");
  const groupId = c.req.param("groupId");

  try {
    const { performCreatePage } = await import("@deepnotes/session");
    const out = await performCreatePage({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      groupId,
      body: parsed.data,
    });
    return c.json(out, 201);
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

app.get("/api/users/me", async (c) => {
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
    const { getAuthenticatedUserSummary } = await import("@deepnotes/session");
    const summary = await getAuthenticatedUserSummary({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
    });
    return c.json(summary, 200);
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

app.post("/api/users/email-verification/resend", async (c) => {
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

  const parsed = emailVerificationResendRequestSchema.safeParse(bodyJson);
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
    const { performResendEmailVerification } = await import(
      "@deepnotes/session"
    );
    await performResendEmailVerification({
      db,
      env: sessionEnv,
      email: parsed.data.email,
    });
    return c.body(null, 204);
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

app.post("/api/users/email-verification/confirm", async (c) => {
  const hyper = c.env?.HYPERDRIVE;
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

  const parsed = emailVerificationConfirmRequestSchema.safeParse(bodyJson);
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
    const { performConfirmEmailVerification } = await import(
      "@deepnotes/session"
    );
    await performConfirmEmailVerification({ db, body: parsed.data });
    return c.body(null, 204);
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

app.post("/api/users/me/2fa/enable/request", async (c) => {
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
  const parsed = user2faPasswordBodySchema.safeParse(bodyJson);
  if (!parsed.success) {
    return c.json(
      { code: "VALIDATION_ERROR", message: parsed.error.flatten().formErrors.join("; ") },
      400,
    );
  }
  const db = getDbForConnectionString(hyper.connectionString);
  const cookieHeader = c.req.header("Cookie");
  try {
    const { performUserTwoFactorEnableRequest } = await import("@deepnotes/session");
    const out = await performUserTwoFactorEnableRequest({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      loginHash: parsed.data.loginHash,
    });
    return c.json(out, 200);
  } catch (e) {
    const { SessionError } = await import("@deepnotes/session");
    if (e instanceof SessionError) {
      return c.json({ code: e.code, message: e.message }, e.status as ContentfulStatusCode);
    }
    throw e;
  }
});

app.post("/api/users/me/2fa/enable/finish", async (c) => {
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
  const parsed = user2faEnableFinishRequestSchema.safeParse(bodyJson);
  if (!parsed.success) {
    return c.json(
      { code: "VALIDATION_ERROR", message: parsed.error.flatten().formErrors.join("; ") },
      400,
    );
  }
  const db = getDbForConnectionString(hyper.connectionString);
  const cookieHeader = c.req.header("Cookie");
  try {
    const { performUserTwoFactorEnableFinish } = await import("@deepnotes/session");
    const out = await performUserTwoFactorEnableFinish({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      loginHash: parsed.data.loginHash,
      authenticatorToken: parsed.data.authenticatorToken,
    });
    return c.json(out, 200);
  } catch (e) {
    const { SessionError } = await import("@deepnotes/session");
    if (e instanceof SessionError) {
      return c.json({ code: e.code, message: e.message }, e.status as ContentfulStatusCode);
    }
    throw e;
  }
});

app.post("/api/users/me/2fa/load", async (c) => {
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
  const parsed = user2faPasswordBodySchema.safeParse(bodyJson);
  if (!parsed.success) {
    return c.json(
      { code: "VALIDATION_ERROR", message: parsed.error.flatten().formErrors.join("; ") },
      400,
    );
  }
  const db = getDbForConnectionString(hyper.connectionString);
  const cookieHeader = c.req.header("Cookie");
  try {
    const { performUserTwoFactorLoad } = await import("@deepnotes/session");
    const out = await performUserTwoFactorLoad({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      loginHash: parsed.data.loginHash,
    });
    return c.json(out, 200);
  } catch (e) {
    const { SessionError } = await import("@deepnotes/session");
    if (e instanceof SessionError) {
      return c.json({ code: e.code, message: e.message }, e.status as ContentfulStatusCode);
    }
    throw e;
  }
});

app.post("/api/users/me/2fa/recovery-codes", async (c) => {
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
  const parsed = user2faPasswordBodySchema.safeParse(bodyJson);
  if (!parsed.success) {
    return c.json(
      { code: "VALIDATION_ERROR", message: parsed.error.flatten().formErrors.join("; ") },
      400,
    );
  }
  const db = getDbForConnectionString(hyper.connectionString);
  const cookieHeader = c.req.header("Cookie");
  try {
    const { performUserTwoFactorGenerateRecoveryCodes } = await import(
      "@deepnotes/session"
    );
    const out = await performUserTwoFactorGenerateRecoveryCodes({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      loginHash: parsed.data.loginHash,
    });
    return c.json(out, 200);
  } catch (e) {
    const { SessionError } = await import("@deepnotes/session");
    if (e instanceof SessionError) {
      return c.json({ code: e.code, message: e.message }, e.status as ContentfulStatusCode);
    }
    throw e;
  }
});

app.post("/api/users/me/2fa/devices/forget", async (c) => {
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
  const parsed = user2faPasswordBodySchema.safeParse(bodyJson);
  if (!parsed.success) {
    return c.json(
      { code: "VALIDATION_ERROR", message: parsed.error.flatten().formErrors.join("; ") },
      400,
    );
  }
  const db = getDbForConnectionString(hyper.connectionString);
  const cookieHeader = c.req.header("Cookie");
  try {
    const { performUserTwoFactorForgetDevices } = await import("@deepnotes/session");
    await performUserTwoFactorForgetDevices({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      loginHash: parsed.data.loginHash,
    });
    return c.body(null, 204);
  } catch (e) {
    const { SessionError } = await import("@deepnotes/session");
    if (e instanceof SessionError) {
      return c.json({ code: e.code, message: e.message }, e.status as ContentfulStatusCode);
    }
    throw e;
  }
});

app.post("/api/users/me/2fa/disable", async (c) => {
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
  const parsed = user2faPasswordBodySchema.safeParse(bodyJson);
  if (!parsed.success) {
    return c.json(
      { code: "VALIDATION_ERROR", message: parsed.error.flatten().formErrors.join("; ") },
      400,
    );
  }
  const db = getDbForConnectionString(hyper.connectionString);
  const cookieHeader = c.req.header("Cookie");
  try {
    const { performUserTwoFactorDisable } = await import("@deepnotes/session");
    await performUserTwoFactorDisable({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      loginHash: parsed.data.loginHash,
    });
    return c.body(null, 204);
  } catch (e) {
    const { SessionError } = await import("@deepnotes/session");
    if (e instanceof SessionError) {
      return c.json({ code: e.code, message: e.message }, e.status as ContentfulStatusCode);
    }
    throw e;
  }
});

export default app;
