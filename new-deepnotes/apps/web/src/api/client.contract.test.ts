import { http, HttpResponse } from "msw";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  contractApiBaseUrl,
  deepnotesSessionContractHandlers,
  mswSessionLoginSuccess,
} from "../test/msw/deepnotes-handlers";
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

  describe("session POST routes", () => {
    beforeEach(() => {
      mswServer.use(...deepnotesSessionContractHandlers());
    });

    it("POST /api/sessions/logout returns 204 with empty body", async () => {
      const client = createDeepnotesApiClient(contractApiBaseUrl);
      const { data, error, response } = await client.POST(
        "/api/sessions/logout",
        {},
      );
      expect(response.status).toBe(204);
      expect(error).toBeUndefined();
      expect(data).toBeUndefined();
    });

    it("POST /api/sessions/refresh returns 200 and SessionRefreshSuccess", async () => {
      const client = createDeepnotesApiClient(contractApiBaseUrl);
      const { data, error, response } = await client.POST(
        "/api/sessions/refresh",
        {},
      );
      expect(response.status).toBe(200);
      expect(error).toBeUndefined();
      expect(data).toMatchObject({
        oldSessionKey: "dGVzdA==",
        newSessionKey: "dGVzdGI=",
      });
    });

    it("POST /api/sessions/demo returns 200 and SessionLoginSuccess", async () => {
      const client = createDeepnotesApiClient(contractApiBaseUrl);
      const body = await import("../features/auth/build-demo-session").then((m) =>
        m.buildSessionDemoRequest(),
      );
      const { data, error, response } = await client.POST("/api/sessions/demo", {
        body,
      });
      expect(response.status).toBe(200);
      expect(error).toBeUndefined();
      expect(data).toMatchObject({
        ...mswSessionLoginSuccess,
      });
    });

    it("POST /api/sessions/login returns 200 and SessionLoginSuccess", async () => {
      const client = createDeepnotesApiClient(contractApiBaseUrl);
      const { loginPreimageFromPassword, uint8ToBase64 } = await import(
        "../features/auth/bytes"
      );
      const body = {
        email: "a@example.com",
        loginHash: uint8ToBase64(loginPreimageFromPassword("pw")),
        rememberSession: false,
      };
      const { data, error, response } = await client.POST("/api/sessions/login", {
        body,
      });
      expect(response.status).toBe(200);
      expect(error).toBeUndefined();
      expect(data).toMatchObject({ ...mswSessionLoginSuccess });
    });

    it("POST /api/sessions/login maps 401 + SessionErrorResponse (2FA)", async () => {
      mswServer.use(
        http.post(`${contractApiBaseUrl}/api/sessions/login`, () =>
          HttpResponse.json(
            {
              code: "UNAUTHORIZED",
              message: "Requires two-factor authentication.",
            },
            { status: 401 },
          ),
        ),
      );
      const client = createDeepnotesApiClient(contractApiBaseUrl);
      const { loginPreimageFromPassword, uint8ToBase64 } = await import(
        "../features/auth/bytes"
      );
      const { data, error, response } = await client.POST("/api/sessions/login", {
        body: {
          email: "a@example.com",
          loginHash: uint8ToBase64(loginPreimageFromPassword("pw")),
          rememberSession: true,
        },
      });
      expect(response.status).toBe(401);
      expect(data).toBeUndefined();
      expect(error).toMatchObject({
        code: "UNAUTHORIZED",
        message: "Requires two-factor authentication.",
      });
    });
  });
});
