import type { ContentfulStatusCode } from "hono/utils/http-status";
import Stripe from "stripe";
import {
  emailVerificationConfirmRequestSchema,
  emailVerificationResendRequestSchema,
  userAccountDeleteRequestSchema,
  userDefaultArrowPatchSchema,
  userDefaultNotePatchSchema,
  userEmailChangeConfirmRequestSchema,
  userEmailChangeRequestSchema,
  userIdPathSchema,
  userNotificationsQuerySchema,
  userPageIdsBodySchema,
  userPagesPathQuerySchema,
  userPasswordChangeRequestSchema,
  userRegisterRequestSchema,
  user2faEnableFinishRequestSchema,
  user2faPasswordBodySchema,
} from "@deepnotes/api";

import type { ApiHono } from "../api-hono.js";
import { readCookieHeader } from "../cookies.js";
import { getDbForConnectionString } from "../db-pool.js";
import { appendSetCookies, serviceUnavailableBody } from "../http-helpers.js";
import { getSessionEnv } from "../session-env.js";

export function registerUserRoutes(app: ApiHono): void {
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
    const flattened = parsed.error.flatten();
    const formErrors = flattened.formErrors.join("; ");
    const fieldErrors = Object.entries(flattened.fieldErrors)
      .map(([field, errors]) => `${field}: ${errors?.join(", ")}`)
      .join("; ");
    const message = [formErrors, fieldErrors].filter(Boolean).join("; ") || "Invalid request data";
    return c.json(
      {
        code: "VALIDATION_ERROR",
        message,
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

}
