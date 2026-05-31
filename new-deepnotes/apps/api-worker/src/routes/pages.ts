import type { ContentfulStatusCode } from "hono/utils/http-status";
import {
  pageBacklinkCreateRequestSchema,
  pageBumpRequestSchema,
  pageCollabUpdatesAppendRequestSchema,
  pageCollabUpdatesGetQuerySchema,
  pageIdPathSchema,
  pageMoveRequestSchema,
  pageSnapshotCreateResponseSchema,
  pageSnapshotListResponseSchema,
  pageSnapshotSaveRequestSchema,
} from "@deepnotes/api";
import type { PageMoveBody } from "@deepnotes/session";

import type { ApiHono } from "../api-hono.js";
import { readCookieHeader } from "../cookies.js";
import { getDbForConnectionString } from "../db-pool.js";
import { serviceUnavailableBody } from "../http-helpers.js";
import { getSessionEnv } from "../session-env.js";

export function registerPageRoutes(app: ApiHono): void {
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

  const qParams = pageCollabUpdatesGetQuerySchema.safeParse({
    sinceIndex: c.req.query("sinceIndex"),
    limit: c.req.query("limit"),
  });
  if (!qParams.success) {
    return c.json(
      { code: "VALIDATION_ERROR", message: qParams.error.message },
      400,
    );
  }

  try {
    const { performGetPageCollabUpdates } = await import("@deepnotes/session");
    const out = await performGetPageCollabUpdates({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      pageId: pParams.data.pageId,
      sinceIndex:
        qParams.data.sinceIndex != null
          ? Number(qParams.data.sinceIndex)
          : null,
      limit:
        qParams.data.limit != null ? Number(qParams.data.limit) : undefined,
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

app.get("/api/pages/:pageId/backlinks", async (c) => {
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
    const { performPageBacklinkList } = await import("@deepnotes/session");
    const out = await performPageBacklinkList({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      pageId: pParams.data.pageId,
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

}
