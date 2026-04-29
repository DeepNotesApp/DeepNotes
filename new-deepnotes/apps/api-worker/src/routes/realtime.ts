import type { ContentfulStatusCode } from "hono/utils/http-status";

import type { ApiHono } from "../api-hono.js";
import { readCookieHeader } from "../cookies.js";
import { getDbForConnectionString } from "../db-pool.js";
import { serviceUnavailableBody } from "../http-helpers.js";
import { getSessionEnv } from "../session-env.js";

export function registerRealtimeRoutes(app: ApiHono): void {
app.get("/api/realtime-ws", async (c) => {
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

  const ns = c.env.USER_REALTIME_ROOM;
  if (ns == null) {
    return c.json(
      {
        code: "SERVICE_UNAVAILABLE" as const,
        message: "USER_REALTIME_ROOM durable object binding is not configured.",
      },
      503,
    );
  }

  const db = getDbForConnectionString(hyper.connectionString);
  const cookieHeader = c.req.header("Cookie");

  let summary: { userId: string; demo: boolean };
  try {
    const { getAuthenticatedUserSummary } = await import("@deepnotes/session");
    summary = await getAuthenticatedUserSummary({
      db,
      env: sessionEnv,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
    });
    if (summary.demo) {
      return c.json(
        {
          code: "FORBIDDEN",
          message: "Demo sessions cannot use realtime WebSocket.",
        },
        403,
      );
    }
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

  const id = ns.idFromName(summary.userId);
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

  return stub.fetch(new Request(raw.url, { headers: h, method: raw.method }));
});
}
