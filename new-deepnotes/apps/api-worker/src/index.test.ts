import { describe, expect, it } from "vitest";

import app from "./index.js";

describe("api-worker", () => {
  it("GET /api/health", async () => {
    const res = await app.request("http://test/api/health");
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      status: "ok",
      service: "deepnotes-api-worker",
    });
  });

  it("GET /api/openapi.json", async () => {
    const res = await app.request("http://test/api/openapi.json");
    expect(res.status).toBe(200);
    const json: unknown = await res.json();
    expect(json).toMatchObject({
      openapi: "3.0.0",
      info: { title: "DeepNotes API" },
    });
  });

  it.each([
    ["POST", "/api/sessions/login"],
    ["POST", "/api/sessions/refresh"],
    ["POST", "/api/sessions/logout"],
    ["POST", "/api/sessions/demo"],
    ["GET", "/api/users/me/groups"],
    ["GET", "/api/users/me/pages/starting"],
    [
      "GET",
      "/api/users/me/pages/path?initialPageId=aaaaaaaaaaaaaaaaaaaaa",
    ],
    ["POST", "/api/users/me/pages/recent/remove"],
    ["POST", "/api/users/me/pages/recent/clear"],
    ["POST", "/api/users/me/pages/favorites"],
    ["POST", "/api/users/me/pages/favorites/remove"],
    ["POST", "/api/users/me/pages/favorites/clear"],
    ["PATCH", "/api/users/me/defaults/note"],
    ["PATCH", "/api/users/me/defaults/arrow"],
    ["GET", "/api/users/me/notifications"],
    ["POST", "/api/users/me/notifications/read"],
    [
      "GET",
      "/api/groups/aaaaaaaaaaaaaaaaaaaaa/main-page",
    ],
    [
      "GET",
      "/api/groups/aaaaaaaaaaaaaaaaaaaaa/members",
    ],
    [
      "GET",
      "/api/groups/aaaaaaaaaaaaaaaaaaaaa/members/detail",
    ],
    [
      "GET",
      "/api/groups/aaaaaaaaaaaaaaaaaaaaa/invite-crypto-bootstrap",
    ],
    [
      "GET",
      "/api/groups/aaaaaaaaaaaaaaaaaaaaa/public-keyring",
    ],
    [
      "GET",
      "/api/groups/aaaaaaaaaaaaaaaaaaaaa/pages",
    ],
    [
      "POST",
      "/api/groups/aaaaaaaaaaaaaaaaaaaaa/pages",
    ],
    [
      "POST",
      "/api/groups/aaaaaaaaaaaaaaaaaaaaa/password",
    ],
    [
      "PATCH",
      "/api/groups/aaaaaaaaaaaaaaaaaaaaa/password",
    ],
    [
      "DELETE",
      "/api/groups/aaaaaaaaaaaaaaaaaaaaa/password",
    ],
    [
      "POST",
      "/api/groups/aaaaaaaaaaaaaaaaaaaaa/privacy/public",
    ],
    [
      "PATCH",
      "/api/groups/aaaaaaaaaaaaaaaaaaaaa/privacy/join-requests",
    ],
    [
      "POST",
      "/api/groups/aaaaaaaaaaaaaaaaaaaaa/privacy/private",
    ],
    ["DELETE", "/api/groups/aaaaaaaaaaaaaaaaaaaaa"],
    [
      "POST",
      "/api/groups/aaaaaaaaaaaaaaaaaaaaa/restore",
    ],
    ["POST", "/api/groups/aaaaaaaaaaaaaaaaaaaaa/purge"],
    [
      "POST",
      "/api/groups/aaaaaaaaaaaaaaaaaaaaa/join-invitations",
    ],
    [
      "POST",
      "/api/groups/aaaaaaaaaaaaaaaaaaaaa/join-invitations/me/accept",
    ],
    [
      "POST",
      "/api/groups/aaaaaaaaaaaaaaaaaaaaa/join-invitations/me/reject",
    ],
    [
      "DELETE",
      "/api/groups/aaaaaaaaaaaaaaaaaaaaa/join-invitations/bbbbbbbbbbbbbbbbbbbbb",
    ],
    ["POST", "/api/groups/aaaaaaaaaaaaaaaaaaaaa/join-requests"],
    [
      "POST",
      "/api/groups/aaaaaaaaaaaaaaaaaaaaa/join-requests/me/cancel",
    ],
    [
      "POST",
      "/api/groups/aaaaaaaaaaaaaaaaaaaaa/join-requests/bbbbbbbbbbbbbbbbbbbbb/accept",
    ],
    [
      "POST",
      "/api/groups/aaaaaaaaaaaaaaaaaaaaa/join-requests/bbbbbbbbbbbbbbbbbbbbb/reject",
    ],
    [
      "PATCH",
      "/api/groups/aaaaaaaaaaaaaaaaaaaaa/members/bbbbbbbbbbbbbbbbbbbbb",
    ],
    [
      "DELETE",
      "/api/groups/aaaaaaaaaaaaaaaaaaaaa/members/bbbbbbbbbbbbbbbbbbbbb",
    ],
    ["POST", "/api/pages/aaaaaaaaaaaaaaaaaaaaa/move"],
    ["POST", "/api/pages/aaaaaaaaaaaaaaaaaaaaa/bump"],
    ["GET", "/api/pages/aaaaaaaaaaaaaaaaaaaaa/collab-updates"],
    ["POST", "/api/pages/aaaaaaaaaaaaaaaaaaaaa/collab-updates"],
    ["POST", "/api/pages/aaaaaaaaaaaaaaaaaaaaa/backlinks"],
    [
      "DELETE",
      "/api/pages/aaaaaaaaaaaaaaaaaaaaa/backlinks/bbbbbbbbbbbbbbbbbbbbb",
    ],
    ["POST", "/api/pages/aaaaaaaaaaaaaaaaaaaaa/snapshots"],
    [
      "GET",
      "/api/pages/aaaaaaaaaaaaaaaaaaaaa/snapshots/bbbbbbbbbbbbbbbbbbbbb",
    ],
    [
      "DELETE",
      "/api/pages/aaaaaaaaaaaaaaaaaaaaa/snapshots/bbbbbbbbbbbbbbbbbbbbb",
    ],
    ["DELETE", "/api/pages/aaaaaaaaaaaaaaaaaaaaa"],
    ["POST", "/api/pages/aaaaaaaaaaaaaaaaaaaaa/restore"],
    ["POST", "/api/pages/aaaaaaaaaaaaaaaaaaaaa/purge"],
    ["GET", "/api/users/me"],
    [
      "GET",
      "/api/users/aaaaaaaaaaaaaaaaaaaaa/public-keyring",
    ],
    ["POST", "/api/users/me/password"],
    ["DELETE", "/api/users/me"],
    ["POST", "/api/users"],
    ["POST", "/api/users/email-verification/resend"],
    ["POST", "/api/users/me/email-change"],
    ["POST", "/api/users/me/email-change/confirm"],
    ["POST", "/api/users/me/2fa/enable/request"],
    ["POST", "/api/users/me/2fa/enable/finish"],
    ["POST", "/api/users/me/2fa/load"],
    ["POST", "/api/users/me/2fa/recovery-codes"],
    ["POST", "/api/users/me/2fa/devices/forget"],
    ["POST", "/api/users/me/2fa/disable"],
    ["POST", "/api/billing/stripe/checkout-session"],
    ["POST", "/api/billing/stripe/portal-session"],
    ["POST", "/api/webhooks/stripe"],
  ] as const)("returns 503 for %s %s when auth env is not configured", async (method, path) => {
    const res = await app.request(`http://test${path}`, { method });
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
    });
  });

  it("returns 503 for POST /api/users/email-verification/confirm when hyperdrive is not bound", async () => {
    const res = await app.request(
      "http://test/api/users/email-verification/confirm",
      {
        method: "POST",
        body: JSON.stringify({ emailVerificationCode: "a".repeat(21) }),
        headers: { "Content-Type": "application/json" },
      },
    );
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
    });
  });
});
