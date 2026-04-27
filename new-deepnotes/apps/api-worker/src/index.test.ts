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
  ] as const)("returns 503 for %s %s when auth env is not configured", async (method, path) => {
    const res = await app.request(`http://test${path}`, { method });
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
    });
  });

  it("POST /api/sessions/demo returns 501 until registration is wired", async () => {
    const res = await app.request("http://test/api/sessions/demo", {
      method: "POST",
    });
    expect(res.status).toBe(501);
    await expect(res.json()).resolves.toMatchObject({
      code: "NOT_IMPLEMENTED",
    });
  });
});
