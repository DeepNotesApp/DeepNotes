import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { contractApiBaseUrl } from "../test/msw/deepnotes-handlers";
import { mswServer } from "../test/msw/node";
import { createDeepnotesApiClient } from "./client";

describe("createDeepnotesApiClient (MSW contract)", () => {
  beforeAll(() => {
    mswServer.listen({ onUnhandledRequest: "error" });
  });

  afterEach(() => {
    mswServer.resetHandlers();
  });

  afterAll(() => {
    mswServer.close();
  });

  it("GET /api/health returns 200 and HealthResponse shape", async () => {
    const client = createDeepnotesApiClient(contractApiBaseUrl);
    const { data, error, response } = await client.GET("/api/health");

    expect(response.status).toBe(200);
    expect(error).toBeUndefined();
    expect(data).toEqual({ status: "ok", service: "msw" });
  });

  it("GET /api/users/me returns 200 and UserMeResponse; fetch uses credentials", async () => {
    const client = createDeepnotesApiClient(contractApiBaseUrl);
    const { data, error, response } = await client.GET("/api/users/me");

    expect(response.status).toBe(200);
    expect(error).toBeUndefined();
    expect(data).toMatchObject({
      userId: "u_msw",
      emailVerified: true,
      demo: false,
      personalGroupId: "g_msw",
    });
  });

  it("maps 401 error body for /api/users/me", async () => {
    mswServer.use(
      http.get(`${contractApiBaseUrl}/api/users/me`, () =>
        HttpResponse.json(
          { code: "UNAUTHORIZED", message: "Not logged in." },
          { status: 401 },
        ),
      ),
    );

    const client = createDeepnotesApiClient(contractApiBaseUrl);
    const { data, error, response } = await client.GET("/api/users/me");

    expect(response.status).toBe(401);
    expect(data).toBeUndefined();
    expect(error).toMatchObject({
      code: "UNAUTHORIZED",
      message: "Not logged in.",
    });
  });
});
