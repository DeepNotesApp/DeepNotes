import {
  emailVerificationConfirmRequestSchema,
  emailVerificationResendRequestSchema,
  getOpenApiDocument,
  groupPageCreateRequestSchema,
  groupPagesListQuerySchema,
  pageBacklinkCreateRequestSchema,
  pageBumpRequestSchema,
  pageCollabUpdatesAppendRequestSchema,
  pageMoveRequestSchema,
  pageIdPathSchema,
  pageSnapshotCreateResponseSchema,
  pageSnapshotListResponseSchema,
  pageSnapshotSaveRequestSchema,
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
  userIdPathSchema,
  stripeCheckoutSessionRequestSchema,
} from "@deepnotes/api";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { DurableObjectNamespace, Fetcher } from "@cloudflare/workers-types";
import { Hono } from "hono";
import type { PageMoveBody } from "@deepnotes/session";
import Stripe from "stripe";

import { getDbForConnectionString } from "./db-pool.js";
import { readCookieHeader } from "./cookies.js";
import { getSessionRedisPort } from "./redis-port.js";
import {
  getSessionEnv,
  getStripeBillingEnv,
  getStripeWebhookSecret,
  type WorkerSessionBindings,
} from "./session-env.js";

type Bindings = WorkerSessionBindings & {
  /** Wired in `wrangler.toml`; optional in unit tests that do not pass `env`. */
  HYPERDRIVE?: Hyperdrive;
  /** Durable Object namespace for live page collab (optional in Vitest). */
  PAGE_COLLAB_ROOM?: DurableObjectNamespace;
  /** Same-worker service binding for DO → HTTP internal append. */
  WORKER_SELF?: Fetcher;
  /** Shared secret for `/api/internal/.../collab-ws-append` (Wrangler secret / `.dev.vars`). */
  COLLAB_INTERNAL_SECRET?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

const serviceUnavailableBody = {
  code: "SERVICE_UNAVAILABLE" as const,
  message:
    "Session routes require ACCESS_SECRET, REFRESH_SECRET, USER_EMAIL_SECRET, USER_EMAIL_ENCRYPTION_KEY, USER_REHASHED_LOGIN_HASH_ENCRYPTION_KEY, USER_AUTHENTICATOR_SECRET_ENCRYPTION_KEY, USER_RECOVERY_CODES_ENCRYPTION_KEY, and GROUP_REHASHED_PASSWORD_HASH_ENCRYPTION_KEY (e.g. Wrangler secrets / .dev.vars).",
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
    const stripeKey = c.env.STRIPE_SECRET_KEY;
    const { cookieLines } = await performUserEmailChangeConfirm({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      oldLoginHash: parsed.data.oldLoginHash,
      emailVerificationCode: parsed.data.emailVerificationCode,
      newLoginHash: parsed.data.newLoginHash,
      newEncryptedPrivateKeyring: parsed.data.userEncryptedPrivateKeyring,
      newEncryptedSymmetricKeyring: parsed.data.userEncryptedSymmetricKeyring,
      updateStripeCustomerEmail:
        stripeKey != null && stripeKey.length > 0
          ? async (customerId: string, newEmail: string) => {
              const stripe = new Stripe(stripeKey);
              await stripe.customers.update(customerId, { email: newEmail });
            }
          : undefined,
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
    const stripeKey = c.env.STRIPE_SECRET_KEY;
    const { cookieLines } = await performUserAccountDelete({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      loginHash,
      deleteStripeCustomer:
        stripeKey != null && stripeKey.length > 0
          ? async (customerId: string) => {
              const stripe = new Stripe(stripeKey);
              await stripe.customers.del(customerId);
            }
          : undefined,
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

app.get("/api/users/me/pages/recent", async (c) => {
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
    const { performGetRecentPageIds } = await import("@deepnotes/session");
    const out = await performGetRecentPageIds({
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

app.get("/api/users/me/pages/favorites", async (c) => {
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
    const { performGetFavoritePageIds } = await import("@deepnotes/session");
    const out = await performGetFavoritePageIds({
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

app.get("/api/groups/:groupId/members/detail", async (c) => {
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
    const { performGetGroupMembersDetail } = await import("@deepnotes/session");
    const out = await performGetGroupMembersDetail({
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

app.get("/api/groups/:groupId/invite-crypto-bootstrap", async (c) => {
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
    const { performGetGroupInviteCryptoBootstrap } = await import(
      "@deepnotes/session"
    );
    const out = await performGetGroupInviteCryptoBootstrap({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      groupId,
    });
    return c.json(
      {
        groupPublicKeyring: out.groupPublicKeyring.toString("base64"),
        groupAccessKeyring:
          out.groupAccessKeyring == null
            ? null
            : out.groupAccessKeyring.toString("base64"),
        memberEncryptedAccessKeyring:
          out.memberEncryptedAccessKeyring == null
            ? null
            : out.memberEncryptedAccessKeyring.toString("base64"),
        memberEncryptedInternalKeyring:
          out.memberEncryptedInternalKeyring.toString("base64"),
      },
      200,
    );
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

app.get("/api/groups/:groupId/collab-crypto-context", async (c) => {
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
    const { performGetGroupCollabCryptoContext } = await import(
      "@deepnotes/session"
    );
    const out = await performGetGroupCollabCryptoContext({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      groupId,
    });
    return c.json(
      {
        groupEncryptedContentKeyring:
          out.groupEncryptedContentKeyring.toString("base64"),
        groupAccessKeyring:
          out.groupAccessKeyring == null
            ? null
            : out.groupAccessKeyring.toString("base64"),
        memberEncryptedAccessKeyring:
          out.memberEncryptedAccessKeyring == null
            ? null
            : out.memberEncryptedAccessKeyring.toString("base64"),
      },
      200,
    );
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

app.get("/api/groups/:groupId/privacy/make-private-bootstrap", async (c) => {
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
    const { performGetGroupPrivacyMakePrivateBootstrap } = await import(
      "@deepnotes/session"
    );
    const out = await performGetGroupPrivacyMakePrivateBootstrap({
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

app.get("/api/groups/:groupId/public-keyring", async (c) => {
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
    const { performGetGroupPublicKeyringForMessaging } = await import(
      "@deepnotes/session"
    );
    const out = await performGetGroupPublicKeyringForMessaging({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      groupId,
    });
    return c.json(
      {
        groupPublicKeyring: out.groupPublicKeyring.toString("base64"),
      },
      200,
    );
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

app.post("/api/pages/:pageId/move", async (c) => {
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

  const pParams = pageIdPathSchema.safeParse({ pageId: c.req.param("pageId") });
  if (!pParams.success) {
    return c.json(
      { code: "VALIDATION_ERROR", message: pParams.error.message },
      400,
    );
  }
  const parsed = pageMoveRequestSchema.safeParse(bodyJson);
  if (!parsed.success) {
    return c.json(
      {
        code: "VALIDATION_ERROR",
        message: parsed.error.flatten().formErrors.join("; "),
      },
      400,
    );
  }

  const d = parsed.data;
  const moveBody: PageMoveBody = {
    destGroupId: d.destGroupId,
    setAsMainPage: d.setAsMainPage,
    groupCreation:
      d.groupCreation == null
        ? undefined
        : {
            groupEncryptedName: d.groupCreation.groupEncryptedName,
            groupPasswordHash: d.groupCreation.groupPasswordHash,
            groupIsPublic: d.groupCreation.groupIsPublic,
            groupAccessKeyring: d.groupCreation.groupAccessKeyring,
            groupEncryptedInternalKeyring:
              d.groupCreation.groupEncryptedInternalKeyring,
            groupEncryptedContentKeyring: d.groupCreation.groupEncryptedContentKeyring,
            groupPublicKeyring: d.groupCreation.groupPublicKeyring,
            groupEncryptedPrivateKeyring: d.groupCreation.groupEncryptedPrivateKeyring,
            groupOwnerEncryptedName: d.groupCreation.groupOwnerEncryptedName,
          },
    reencrypt:
      d.reencrypt == null
        ? undefined
        : {
            pageEncryptedSymmetricKeyring:
              d.reencrypt.pageEncryptedSymmetricKeyring,
            pageEncryptedRelativeTitle: d.reencrypt.pageEncryptedRelativeTitle,
            pageEncryptedAbsoluteTitle: d.reencrypt.pageEncryptedAbsoluteTitle,
            pageEncryptedUpdate: d.reencrypt.pageEncryptedUpdate,
            pageEncryptedSnapshots: Object.fromEntries(
              Object.entries(d.reencrypt.pageEncryptedSnapshots).map(
                ([id, snap]) => [
                  id,
                  {
                    encryptedSymmetricKey: snap.encryptedSymmetricKey,
                    encryptedData: snap.encryptedData,
                  },
                ],
              ),
            ),
          },
  };

  const db = getDbForConnectionString(hyper.connectionString);
  const cookieHeader = c.req.header("Cookie");
  try {
    const { performPageMove } = await import("@deepnotes/session");
    await performPageMove({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      pageId: pParams.data.pageId,
      body: moveBody,
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

app.post("/api/pages/:pageId/bump", async (c) => {
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

  let bodyJson: unknown = {};
  try {
    const txt = await c.req.text();
    if (txt.length > 0) {
      bodyJson = JSON.parse(txt) as unknown;
    }
  } catch {
    return c.json({ code: "BAD_REQUEST", message: "Expected JSON object." }, 400);
  }

  const pParams = pageIdPathSchema.safeParse({ pageId: c.req.param("pageId") });
  if (!pParams.success) {
    return c.json(
      { code: "VALIDATION_ERROR", message: pParams.error.message },
      400,
    );
  }
  const parsed = pageBumpRequestSchema.safeParse(bodyJson);
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
    const { performPageBump } = await import("@deepnotes/session");
    await performPageBump({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      pageId: pParams.data.pageId,
      parentPageId: parsed.data.parentPageId,
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

app.post("/api/internal/pages/:pageId/collab-ws-append", async (c) => {
  const secretConfigured = c.env.COLLAB_INTERNAL_SECRET;
  if (secretConfigured == null || secretConfigured === "") {
    return c.json(
      {
        code: "SERVICE_UNAVAILABLE" as const,
        message: "Collab internal secret is not configured.",
      },
      503,
    );
  }
  if (c.req.header("X-Collab-Internal-Secret") !== secretConfigured) {
    return c.json(
      { code: "UNAUTHORIZED", message: "Invalid collab internal secret." },
      401,
    );
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

  const pParams = pageIdPathSchema.safeParse({ pageId: c.req.param("pageId") });
  if (!pParams.success) {
    return c.json(
      { code: "VALIDATION_ERROR", message: pParams.error.message },
      400,
    );
  }

  let bodyJson: unknown;
  try {
    bodyJson = await c.req.json();
  } catch {
    return c.json({ code: "BAD_REQUEST", message: "Expected JSON body." }, 400);
  }

  if (
    bodyJson == null ||
    typeof bodyJson !== "object" ||
    !("userId" in bodyJson) ||
    !("encryptedDataBase64" in bodyJson) ||
    typeof (bodyJson as { userId: unknown }).userId !== "string" ||
    typeof (bodyJson as { encryptedDataBase64: unknown }).encryptedDataBase64 !==
      "string"
  ) {
    return c.json(
      { code: "BAD_REQUEST", message: "Expected userId and encryptedDataBase64." },
      400,
    );
  }

  const { base64ToUint8Standard } = await import("@deepnotes/collab-wire");
  const userId = (bodyJson as { userId: string }).userId;
  const encryptedData = base64ToUint8Standard(
    (bodyJson as { encryptedDataBase64: string }).encryptedDataBase64,
  );

  const db = getDbForConnectionString(hyper.connectionString);

  try {
    const { performTrustedAppendNextPageCollabUpdate } =
      await import("@deepnotes/session");
    const { newIndex } = await performTrustedAppendNextPageCollabUpdate({
      db,
      pageId: pParams.data.pageId,
      userId,
      encryptedData,
    });
    return c.json({ newIndex }, 200);
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

app.get("/api/pages/:pageId/collab-ws", async (c) => {
  const sessionEnv = getSessionEnv(c.env);
  if (sessionEnv == null) {
    return c.json(serviceUnavailableBody, 503);
  }

  if (c.req.header("Upgrade") !== "websocket") {
    return c.text("Expected WebSocket Upgrade request.", 426);
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
  const ns = c.env.PAGE_COLLAB_ROOM;
  if (ns == null) {
    return c.json(
      {
        code: "SERVICE_UNAVAILABLE" as const,
        message: "PAGE_COLLAB_ROOM durable object binding is not configured.",
      },
      503,
    );
  }
  if (c.env.COLLAB_INTERNAL_SECRET == null || c.env.COLLAB_INTERNAL_SECRET === "") {
    return c.json(
      {
        code: "SERVICE_UNAVAILABLE" as const,
        message: "COLLAB_INTERNAL_SECRET is not configured.",
      },
      503,
    );
  }
  if (c.env.WORKER_SELF == null) {
    return c.json(
      {
        code: "SERVICE_UNAVAILABLE" as const,
        message: "WORKER_SELF service binding is not configured.",
      },
      503,
    );
  }

  const pParams = pageIdPathSchema.safeParse({ pageId: c.req.param("pageId") });
  if (!pParams.success) {
    return c.json(
      { code: "VALIDATION_ERROR", message: pParams.error.message },
      400,
    );
  }

  const db = getDbForConnectionString(hyper.connectionString);
  const cookieHeader = c.req.header("Cookie");

  let summary: { userId: string; demo: boolean };
  try {
    const { getAuthenticatedUserSummary, assertPageCollabWsConnectionAllowed } =
      await import("@deepnotes/session");
    summary = await getAuthenticatedUserSummary({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
    });
    if (summary.demo) {
      return c.json(
        {
          code: "FORBIDDEN",
          message: "Demo sessions cannot use live collab WebSocket.",
        },
        403,
      );
    }
    await assertPageCollabWsConnectionAllowed({
      db,
      userId: summary.userId,
      pageId: pParams.data.pageId,
    });
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

  const id = ns.idFromName(pParams.data.pageId);
  const stub = ns.get(id);

  const h = new Headers();
  const raw = c.req.raw;
  for (const [k, v] of raw.headers.entries()) {
    if (k.toLowerCase() === "x-verified-user-id") {
      continue;
    }
    h.append(k, v);
  }
  h.set("X-Verified-User-Id", summary.userId);

  const doReq = new Request(raw.url, { headers: h, method: raw.method });
  return stub.fetch(doReq);
});

app.get("/api/pages/:pageId/collab-updates", async (c) => {
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

  const pParams = pageIdPathSchema.safeParse({ pageId: c.req.param("pageId") });
  if (!pParams.success) {
    return c.json(
      { code: "VALIDATION_ERROR", message: pParams.error.message },
      400,
    );
  }

  const db = getDbForConnectionString(hyper.connectionString);
  const cookieHeader = c.req.header("Cookie");

  try {
    const { performGetPageCollabUpdates } = await import("@deepnotes/session");
    const out = await performGetPageCollabUpdates({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      pageId: pParams.data.pageId,
    });
    return c.json(
      {
        lastIndex: out.lastIndex,
        updates: out.updates.map((u) => ({
          index: u.index,
          encryptedData: u.encryptedData.toString("base64"),
        })),
        groupId: out.groupId,
        pageEncryptedSymmetricKeyring:
          out.pageEncryptedSymmetricKeyring.toString("base64"),
        pageEncryptedRelativeTitle:
          out.pageEncryptedRelativeTitle.toString("base64"),
        pageEncryptedAbsoluteTitle:
          out.pageEncryptedAbsoluteTitle.toString("base64"),
        groupEncryptedContentKeyring:
          out.groupEncryptedContentKeyring.toString("base64"),
        groupAccessKeyring:
          out.groupAccessKeyring != null
            ? out.groupAccessKeyring.toString("base64")
            : null,
        memberEncryptedAccessKeyring:
          out.memberEncryptedAccessKeyring != null
            ? out.memberEncryptedAccessKeyring.toString("base64")
            : null,
      },
      200,
    );
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

app.post("/api/pages/:pageId/collab-updates", async (c) => {
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

  const pParams = pageIdPathSchema.safeParse({ pageId: c.req.param("pageId") });
  if (!pParams.success) {
    return c.json(
      { code: "VALIDATION_ERROR", message: pParams.error.message },
      400,
    );
  }
  const parsed = pageCollabUpdatesAppendRequestSchema.safeParse(bodyJson);
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
    const { performAppendPageCollabUpdates } = await import("@deepnotes/session");
    await performAppendPageCollabUpdates({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      pageId: pParams.data.pageId,
      expectedLastIndex: parsed.data.expectedLastIndex,
      updates: parsed.data.updates,
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

app.post("/api/pages/:pageId/backlinks", async (c) => {
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

  const pParams = pageIdPathSchema.safeParse({ pageId: c.req.param("pageId") });
  if (!pParams.success) {
    return c.json(
      { code: "VALIDATION_ERROR", message: pParams.error.message },
      400,
    );
  }
  const parsed = pageBacklinkCreateRequestSchema.safeParse(bodyJson);
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
    const { performPageBacklinkCreate } = await import("@deepnotes/session");
    await performPageBacklinkCreate({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      targetPageId: pParams.data.pageId,
      sourcePageId: parsed.data.sourcePageId,
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

app.delete("/api/pages/:pageId/backlinks/:targetPageId", async (c) => {
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

  const pParams = pageIdPathSchema
    .extend({ targetPageId: pageIdPathSchema.shape.pageId })
    .safeParse({
      pageId: c.req.param("pageId"),
      targetPageId: c.req.param("targetPageId"),
    });
  if (!pParams.success) {
    return c.json(
      { code: "VALIDATION_ERROR", message: pParams.error.message },
      400,
    );
  }

  const db = getDbForConnectionString(hyper.connectionString);
  const cookieHeader = c.req.header("Cookie");

  try {
    const { performPageBacklinkDelete } = await import("@deepnotes/session");
    await performPageBacklinkDelete({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      sourcePageId: pParams.data.pageId,
      targetPageId: pParams.data.targetPageId,
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

app.get("/api/pages/:pageId/snapshots", async (c) => {
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

  const pParams = pageIdPathSchema.safeParse({ pageId: c.req.param("pageId") });
  if (!pParams.success) {
    return c.json(
      { code: "VALIDATION_ERROR", message: pParams.error.message },
      400,
    );
  }

  const db = getDbForConnectionString(hyper.connectionString);
  const cookieHeader = c.req.header("Cookie");

  try {
    const { performPageSnapshotList } = await import("@deepnotes/session");
    const out = await performPageSnapshotList({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      pageId: pParams.data.pageId,
    });
    const body = pageSnapshotListResponseSchema.parse({
      snapshots: out.snapshots.map((s) => ({
        snapshotId: s.snapshotId,
        creationDate: s.creationDate,
        type: s.type,
      })),
    });
    return c.json(body, 200);
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

app.post("/api/pages/:pageId/snapshots", async (c) => {
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

  const pParams = pageIdPathSchema.safeParse({ pageId: c.req.param("pageId") });
  if (!pParams.success) {
    return c.json(
      { code: "VALIDATION_ERROR", message: pParams.error.message },
      400,
    );
  }
  const parsed = pageSnapshotSaveRequestSchema.safeParse(bodyJson);
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
    const { performPageSnapshotSave } = await import("@deepnotes/session");
    const out = await performPageSnapshotSave({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      pageId: pParams.data.pageId,
      encryptedSymmetricKey: parsed.data.encryptedSymmetricKey,
      encryptedData: parsed.data.encryptedData,
      preRestore: parsed.data.preRestore,
    });
    const body = pageSnapshotCreateResponseSchema.parse(out);
    return c.json(body, 201);
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

app.get("/api/pages/:pageId/snapshots/:snapshotId", async (c) => {
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

  const pParams = pageIdPathSchema
    .extend({ snapshotId: pageIdPathSchema.shape.pageId })
    .safeParse({
      pageId: c.req.param("pageId"),
      snapshotId: c.req.param("snapshotId"),
    });
  if (!pParams.success) {
    return c.json(
      { code: "VALIDATION_ERROR", message: pParams.error.message },
      400,
    );
  }

  const db = getDbForConnectionString(hyper.connectionString);
  const cookieHeader = c.req.header("Cookie");

  try {
    const { performPageSnapshotLoad } = await import("@deepnotes/session");
    const out = await performPageSnapshotLoad({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      pageId: pParams.data.pageId,
      snapshotId: pParams.data.snapshotId,
    });
    return c.json(
      {
        encryptedSymmetricKey: out.encryptedSymmetricKey
          ? out.encryptedSymmetricKey.toString("base64")
          : null,
        encryptedData: out.encryptedData.toString("base64"),
      },
      200,
    );
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

app.delete("/api/pages/:pageId/snapshots/:snapshotId", async (c) => {
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

  const pParams = pageIdPathSchema
    .extend({ snapshotId: pageIdPathSchema.shape.pageId })
    .safeParse({
      pageId: c.req.param("pageId"),
      snapshotId: c.req.param("snapshotId"),
    });
  if (!pParams.success) {
    return c.json(
      { code: "VALIDATION_ERROR", message: pParams.error.message },
      400,
    );
  }

  const db = getDbForConnectionString(hyper.connectionString);
  const cookieHeader = c.req.header("Cookie");

  try {
    const { performPageSnapshotDelete } = await import("@deepnotes/session");
    await performPageSnapshotDelete({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      pageId: pParams.data.pageId,
      snapshotId: pParams.data.snapshotId,
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

app.delete("/api/pages/:pageId", async (c) => {
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

  const pParams = pageIdPathSchema.safeParse({ pageId: c.req.param("pageId") });
  if (!pParams.success) {
    return c.json(
      { code: "VALIDATION_ERROR", message: pParams.error.message },
      400,
    );
  }

  const db = getDbForConnectionString(hyper.connectionString);
  const cookieHeader = c.req.header("Cookie");

  try {
    const { performPageSoftDelete } = await import("@deepnotes/session");
    await performPageSoftDelete({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      pageId: pParams.data.pageId,
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

app.post("/api/pages/:pageId/restore", async (c) => {
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

  const pParams = pageIdPathSchema.safeParse({ pageId: c.req.param("pageId") });
  if (!pParams.success) {
    return c.json(
      { code: "VALIDATION_ERROR", message: pParams.error.message },
      400,
    );
  }

  const db = getDbForConnectionString(hyper.connectionString);
  const cookieHeader = c.req.header("Cookie");

  try {
    const { performPageRestore } = await import("@deepnotes/session");
    await performPageRestore({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      pageId: pParams.data.pageId,
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

app.post("/api/pages/:pageId/purge", async (c) => {
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

  const pParams = pageIdPathSchema.safeParse({ pageId: c.req.param("pageId") });
  if (!pParams.success) {
    return c.json(
      { code: "VALIDATION_ERROR", message: pParams.error.message },
      400,
    );
  }

  const db = getDbForConnectionString(hyper.connectionString);
  const cookieHeader = c.req.header("Cookie");

  try {
    const { performPagePurge } = await import("@deepnotes/session");
    await performPagePurge({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      pageId: pParams.data.pageId,
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

app.post("/api/groups/:groupId/password", async (c) => {
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

  const parsed = groupPasswordEnableRequestSchema.safeParse(bodyJson);
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
    const { performGroupPasswordEnable } = await import("@deepnotes/session");
    await performGroupPasswordEnable({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      groupId,
      groupPasswordHash: parsed.data.groupPasswordHash,
      groupEncryptedContentKeyring: parsed.data.groupEncryptedContentKeyring,
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

app.patch("/api/groups/:groupId/password", async (c) => {
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

  const parsed = groupPasswordChangeRequestSchema.safeParse(bodyJson);
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
    const { performGroupPasswordChange } = await import("@deepnotes/session");
    await performGroupPasswordChange({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      groupId,
      groupCurrentPasswordHash: parsed.data.groupCurrentPasswordHash,
      groupNewPasswordHash: parsed.data.groupNewPasswordHash,
      groupEncryptedContentKeyring: parsed.data.groupEncryptedContentKeyring,
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

app.delete("/api/groups/:groupId/password", async (c) => {
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

  const parsed = groupPasswordDisableRequestSchema.safeParse(bodyJson);
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
    const { performGroupPasswordDisable } = await import("@deepnotes/session");
    await performGroupPasswordDisable({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      groupId,
      groupPasswordHash: parsed.data.groupPasswordHash,
      groupEncryptedContentKeyring: parsed.data.groupEncryptedContentKeyring,
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

app.post("/api/groups/:groupId/privacy/public", async (c) => {
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

  const parsed = groupPrivacyPublicRequestSchema.safeParse(bodyJson);
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
    const { performGroupPrivacyMakePublic } = await import(
      "@deepnotes/session"
    );
    await performGroupPrivacyMakePublic({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      groupId,
      accessKeyring: parsed.data.accessKeyring,
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

app.patch("/api/groups/:groupId/privacy/join-requests", async (c) => {
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

  const parsed = groupPrivacyJoinRequestsPatchSchema.safeParse(bodyJson);
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
    const { performGroupPrivacySetJoinRequestsAllowed } = await import(
      "@deepnotes/session"
    );
    await performGroupPrivacySetJoinRequestsAllowed({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      groupId,
      areJoinRequestsAllowed: parsed.data.areJoinRequestsAllowed,
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

app.post("/api/groups/:groupId/privacy/private", async (c) => {
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

  const parsed = groupPrivacyPrivateRequestSchema.safeParse(bodyJson);
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

  const payload = {
    groupAccessKeyring: parsed.data.groupAccessKeyring,
    groupEncryptedName: parsed.data.groupEncryptedName,
    groupEncryptedContentKeyring: parsed.data.groupEncryptedContentKeyring,
    groupPublicKeyring: parsed.data.groupPublicKeyring,
    groupEncryptedPrivateKeyring: parsed.data.groupEncryptedPrivateKeyring,
    groupMembers: parsed.data.groupMembers,
    groupJoinInvitations: parsed.data.groupJoinInvitations,
    groupJoinRequests: parsed.data.groupJoinRequests,
    groupPages: parsed.data.groupPages,
  };

  try {
    const { performGroupPrivacyMakePrivate } = await import("@deepnotes/session");
    await performGroupPrivacyMakePrivate({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      groupId,
      payload,
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

app.delete("/api/groups/:groupId", async (c) => {
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
    const { performGroupSoftDelete } = await import("@deepnotes/session");
    await performGroupSoftDelete({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      groupId,
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

app.post("/api/groups/:groupId/restore", async (c) => {
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
    const { performGroupRestore } = await import("@deepnotes/session");
    await performGroupRestore({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      groupId,
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

app.post("/api/groups/:groupId/purge", async (c) => {
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
    const { performGroupPurge } = await import("@deepnotes/session");
    await performGroupPurge({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      groupId,
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

app.post("/api/groups/:groupId/join-invitations", async (c) => {
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
  const parsed = groupJoinInvitationSendRequestSchema.safeParse(bodyJson);
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
    const { performGroupJoinInvitationSend } = await import("@deepnotes/session");
    await performGroupJoinInvitationSend({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      groupId,
      inviteeUserId: parsed.data.inviteeUserId,
      invitationRole: parsed.data.invitationRole,
      encryptedAccessKeyring: parsed.data.encryptedAccessKeyring,
      encryptedInternalKeyring: parsed.data.encryptedInternalKeyring,
      userEncryptedName: parsed.data.userEncryptedName,
      userEncryptedNameForUser: parsed.data.userEncryptedNameForUser,
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

app.post("/api/groups/:groupId/join-invitations/me/accept", async (c) => {
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
  const parsed = groupJoinInvitationAcceptRequestSchema.safeParse(bodyJson);
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
    const { performGroupJoinInvitationAccept } = await import("@deepnotes/session");
    await performGroupJoinInvitationAccept({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      groupId,
      userEncryptedName: parsed.data.userEncryptedName,
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

app.post("/api/groups/:groupId/join-invitations/me/reject", async (c) => {
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
    const { performGroupJoinInvitationReject } = await import("@deepnotes/session");
    await performGroupJoinInvitationReject({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      groupId,
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

app.delete("/api/groups/:groupId/join-invitations/:userId", async (c) => {
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
  const inviteeUserId = c.req.param("userId");

  try {
    const { performGroupJoinInvitationCancel } = await import("@deepnotes/session");
    await performGroupJoinInvitationCancel({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      groupId,
      inviteeUserId,
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

app.post("/api/groups/:groupId/join-requests", async (c) => {
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
  const parsed = groupJoinRequestSendRequestSchema.safeParse(bodyJson);
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
    const { performGroupJoinRequestSend } = await import("@deepnotes/session");
    await performGroupJoinRequestSend({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      groupId,
      encryptedUserName: parsed.data.encryptedUserName,
      encryptedUserNameForUser: parsed.data.encryptedUserNameForUser,
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

app.post("/api/groups/:groupId/join-requests/me/cancel", async (c) => {
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
    const { performGroupJoinRequestCancel } = await import("@deepnotes/session");
    await performGroupJoinRequestCancel({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      groupId,
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

app.post("/api/groups/:groupId/join-requests/:userId/accept", async (c) => {
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
  const parsed = groupJoinRequestAcceptRequestSchema.safeParse(bodyJson);
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
  const requesterUserId = c.req.param("userId");

  try {
    const { performGroupJoinRequestAccept } = await import("@deepnotes/session");
    await performGroupJoinRequestAccept({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      groupId,
      requesterUserId,
      targetRole: parsed.data.targetRole,
      encryptedAccessKeyring: parsed.data.encryptedAccessKeyring,
      encryptedInternalKeyring: parsed.data.encryptedInternalKeyring,
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

app.post("/api/groups/:groupId/join-requests/:userId/reject", async (c) => {
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
  const requesterUserId = c.req.param("userId");

  try {
    const { performGroupJoinRequestReject } = await import("@deepnotes/session");
    await performGroupJoinRequestReject({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      groupId,
      requesterUserId,
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

app.patch("/api/groups/:groupId/members/:userId", async (c) => {
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
  const parsed = groupMemberRolePatchRequestSchema.safeParse(bodyJson);
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
  const targetUserId = c.req.param("userId");

  try {
    const { performGroupMemberRoleChange } = await import("@deepnotes/session");
    await performGroupMemberRoleChange({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      groupId,
      targetUserId,
      requestedRole: parsed.data.role,
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

app.delete("/api/groups/:groupId/members/:userId", async (c) => {
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
  const targetUserId = c.req.param("userId");

  try {
    const { performGroupMemberRemove } = await import("@deepnotes/session");
    await performGroupMemberRemove({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      groupId,
      targetUserId,
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

app.get("/api/users/:userId/public-keyring", async (c) => {
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

  const p = userIdPathSchema.safeParse({ userId: c.req.param("userId") });
  if (!p.success) {
    return c.json(
      { code: "VALIDATION_ERROR", message: p.error.message },
      400,
    );
  }

  const db = getDbForConnectionString(hyper.connectionString);
  const cookieHeader = c.req.header("Cookie");

  try {
    const { performGetUserPublicKeyring } = await import("@deepnotes/session");
    const out = await performGetUserPublicKeyring({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      userId: p.data.userId,
    });
    return c.json(
      { publicKeyring: out.publicKeyring.toString("base64") },
      200,
    );
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

const billingNotConfiguredBody = {
  code: "SERVICE_UNAVAILABLE" as const,
  message:
    "Stripe billing is not configured. Set STRIPE_SECRET_KEY, STRIPE_MONTHLY_PRICE_ID, and STRIPE_YEARLY_PRICE_ID (Wrangler secrets / .dev.vars).",
} as const;

const stripeWebhookNotConfiguredBody = {
  code: "SERVICE_UNAVAILABLE" as const,
  message:
    "Stripe webhooks are not configured (STRIPE_WEBHOOK_SECRET).",
} as const;

app.post("/api/billing/stripe/checkout-session", async (c) => {
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
  const billing = getStripeBillingEnv(c.env);
  if (billing == null) {
    return c.json(billingNotConfiguredBody, 503);
  }

  let bodyJson: unknown = {};
  try {
    const t = await c.req.text();
    if (t.length > 0) {
      bodyJson = JSON.parse(t) as unknown;
    }
  } catch {
    return c.json({ code: "BAD_REQUEST", message: "Expected JSON object." }, 400);
  }
  const parsed = stripeCheckoutSessionRequestSchema.safeParse(bodyJson);
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
    const { performStripeCreateCheckoutSession } = await import(
      "@deepnotes/session"
    );
    const out = await performStripeCreateCheckoutSession({
      db,
      env: sessionEnv,
      billing,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      requestOrigin: c.req.header("Origin") ?? undefined,
      billingFrequency: parsed.data.billingFrequency,
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

app.post("/api/billing/stripe/portal-session", async (c) => {
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
  const billing = getStripeBillingEnv(c.env);
  if (billing == null) {
    return c.json(billingNotConfiguredBody, 503);
  }

  const db = getDbForConnectionString(hyper.connectionString);
  const cookieHeader = c.req.header("Cookie");
  try {
    const { performStripeCreatePortalSession } = await import(
      "@deepnotes/session"
    );
    const out = await performStripeCreatePortalSession({
      db,
      env: sessionEnv,
      billing,
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

app.post("/api/webhooks/stripe", async (c) => {
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
  const webhookSecret = getStripeWebhookSecret(c.env);
  if (webhookSecret == null) {
    return c.json(stripeWebhookNotConfiguredBody, 503);
  }

  const rawBody = await c.req.text();
  const db = getDbForConnectionString(hyper.connectionString);

  try {
    const {
      parseStripeWebhookEvent,
      processStripeWebhookEvent,
    } = await import("@deepnotes/session");
    const event = parseStripeWebhookEvent({
      rawBody,
      signature: c.req.header("Stripe-Signature") ?? c.req.header("stripe-signature"),
      webhookSecret,
    });
    await processStripeWebhookEvent({ db, event });
    return c.body(null, 200);
  } catch (e) {
    if (e instanceof Stripe.errors.StripeSignatureVerificationError) {
      return c.json(
        { code: "BAD_REQUEST", message: "Invalid Stripe webhook signature." },
        400,
      );
    }
    if (e instanceof Error && e.message === "Missing Stripe-Signature header.") {
      return c.json({ code: "BAD_REQUEST", message: e.message }, 400);
    }
    throw e;
  }
});

export { PageCollabRoom } from "./page-collab-room.js";
export default app;
