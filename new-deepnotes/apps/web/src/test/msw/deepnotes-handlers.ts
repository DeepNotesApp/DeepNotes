import { http, HttpResponse, type RequestHandler } from "msw";

/**
 * Base URL used by MSW contract tests. Must match the client base passed to
 * {@link createDeepnotesApiClient} in those tests.
 */
export const contractApiBaseUrl = "https://msw.contract.test";

/** Arbitrary base64-shaped stub for byte fields in OpenAPI contract tests. */
const stubB64 = "dGVzdA==";
const stubB64b = "dGVzdGI=";

/** Minimal `SessionLoginSuccess` / `SessionRefreshSuccess` bodies for MSW. */
export const mswSessionLoginSuccess = {
  userId: "u_msw",
  sessionId: "ses_msw",
  sessionKey: stubB64,
  personalGroupId: "g_msw",
  publicKeyring: stubB64,
  encryptedPrivateKeyring: stubB64,
  encryptedSymmetricKeyring: stubB64,
} as const;

/**
 * Ephemeral handlers for session POST routes (prepend with `mswServer.use` so
 * they take precedence over unhandled-request errors).
 */
export function deepnotesSessionContractHandlers(): RequestHandler[] {
  return [
    http.post(`${contractApiBaseUrl}/api/sessions/logout`, () => {
      return new HttpResponse(null, { status: 204 });
    }),
    http.post(`${contractApiBaseUrl}/api/sessions/refresh`, () =>
      HttpResponse.json({
        oldSessionKey: stubB64,
        newSessionKey: stubB64b,
      }),
    ),
    http.post(`${contractApiBaseUrl}/api/sessions/demo`, async () =>
      HttpResponse.json({ ...mswSessionLoginSuccess }),
    ),
    http.post(`${contractApiBaseUrl}/api/sessions/login`, async () =>
      HttpResponse.json({ ...mswSessionLoginSuccess }),
    ),
  ];
}

/** OpenAPI-shaped JSON for GET /api/health and GET /api/users/me (see api-types.generated.ts). */
export const deepnotesDefaultHandlers = [
  http.get(`${contractApiBaseUrl}/api/health`, () =>
    HttpResponse.json({ status: "ok" as const, service: "msw" }),
  ),
  http.get(`${contractApiBaseUrl}/api/users/me`, () =>
    HttpResponse.json({
      userId: "u_msw",
      emailVerified: true,
      demo: false,
      personalGroupId: "g_msw",
    }),
  ),
];
