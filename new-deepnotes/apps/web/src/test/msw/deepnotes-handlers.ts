import { http, HttpResponse } from "msw";

/**
 * Base URL used by MSW contract tests. Must match the client base passed to
 * {@link createDeepnotesApiClient} in those tests.
 */
export const contractApiBaseUrl = "https://msw.contract.test";

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
