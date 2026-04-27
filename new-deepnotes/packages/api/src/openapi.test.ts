import { describe, expect, it } from "vitest";

import { getOpenApiDocument } from "./openapi.js";

describe("getOpenApiDocument", () => {
  it("includes /api/health", () => {
    const doc = getOpenApiDocument();
    expect(doc.paths?.["/api/health"]?.get).toBeDefined();
  });

  it("includes session routes (Phase 3 contract)", () => {
    const doc = getOpenApiDocument();
    expect(doc.paths?.["/api/sessions/login"]?.post).toBeDefined();
    expect(doc.paths?.["/api/sessions/refresh"]?.post).toBeDefined();
    expect(doc.paths?.["/api/sessions/logout"]?.post).toBeDefined();
    expect(doc.paths?.["/api/sessions/demo"]?.post).toBeDefined();
    expect(doc.paths?.["/api/users/me"]?.get).toBeDefined();
    expect(doc.paths?.["/api/users/me/password"]?.post).toBeDefined();
    expect(
      doc.paths?.["/api/users/me/email-change"]?.post,
    ).toBeDefined();
    expect(
      doc.paths?.["/api/users/me/email-change/confirm"]?.post,
    ).toBeDefined();
    expect(doc.paths?.["/api/users"]?.post).toBeDefined();
    expect(
      doc.paths?.["/api/users/email-verification/resend"]?.post,
    ).toBeDefined();
    expect(
      doc.paths?.["/api/users/email-verification/confirm"]?.post,
    ).toBeDefined();
    expect(doc.paths?.["/api/users/me"]?.delete).toBeDefined();
    expect(
      doc.paths?.["/api/users/me/2fa/enable/request"]?.post,
    ).toBeDefined();
    expect(
      doc.paths?.["/api/users/me/2fa/enable/finish"]?.post,
    ).toBeDefined();
    expect(doc.paths?.["/api/users/me/2fa/load"]?.post).toBeDefined();
    expect(
      doc.paths?.["/api/users/me/2fa/recovery-codes"]?.post,
    ).toBeDefined();
    expect(
      doc.paths?.["/api/users/me/2fa/devices/forget"]?.post,
    ).toBeDefined();
    expect(doc.paths?.["/api/users/me/2fa/disable"]?.post).toBeDefined();
    expect(doc.paths?.["/api/users/me/groups"]?.get).toBeDefined();
    expect(doc.paths?.["/api/users/me/pages/starting"]?.get).toBeDefined();
    expect(doc.paths?.["/api/users/me/pages/path"]?.get).toBeDefined();
    expect(doc.paths?.["/api/users/me/pages/recent/remove"]?.post).toBeDefined();
    expect(doc.paths?.["/api/users/me/pages/recent/clear"]?.post).toBeDefined();
    expect(doc.paths?.["/api/users/me/pages/favorites"]?.post).toBeDefined();
    expect(doc.paths?.["/api/users/me/pages/favorites/remove"]?.post).toBeDefined();
    expect(doc.paths?.["/api/users/me/pages/favorites/clear"]?.post).toBeDefined();
    expect(doc.paths?.["/api/users/me/defaults/note"]?.patch).toBeDefined();
    expect(doc.paths?.["/api/users/me/defaults/arrow"]?.patch).toBeDefined();
    expect(doc.paths?.["/api/users/me/notifications"]?.get).toBeDefined();
    expect(doc.paths?.["/api/users/me/notifications/read"]?.post).toBeDefined();
    expect(doc.paths?.["/api/groups/{groupId}/main-page"]?.get).toBeDefined();
    expect(doc.paths?.["/api/groups/{groupId}/members"]?.get).toBeDefined();
    expect(doc.paths?.["/api/groups/{groupId}/pages"]?.get).toBeDefined();
    expect(doc.paths?.["/api/groups/{groupId}/pages"]?.post).toBeDefined();
    expect(doc.paths?.["/api/groups/{groupId}/password"]?.post).toBeDefined();
    expect(doc.paths?.["/api/groups/{groupId}/password"]?.patch).toBeDefined();
    expect(doc.paths?.["/api/groups/{groupId}/password"]?.delete).toBeDefined();
    expect(
      doc.paths?.["/api/groups/{groupId}/privacy/public"]?.post,
    ).toBeDefined();
    expect(
      doc.paths?.["/api/groups/{groupId}/privacy/join-requests"]?.patch,
    ).toBeDefined();
    expect(doc.paths?.["/api/groups/{groupId}"]?.delete).toBeDefined();
    expect(doc.paths?.["/api/groups/{groupId}/restore"]?.post).toBeDefined();
    expect(doc.paths?.["/api/groups/{groupId}/purge"]?.post).toBeDefined();
  });
});
