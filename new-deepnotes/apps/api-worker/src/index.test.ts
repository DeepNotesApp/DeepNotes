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
});
