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
    expect(doc.paths?.["/api/groups/{groupId}/pages"]?.get).toBeDefined();
    expect(doc.paths?.["/api/groups/{groupId}/pages"]?.post).toBeDefined();
  });
});
