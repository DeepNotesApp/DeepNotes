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
    expect(doc.paths?.["/api/users"]?.post).toBeDefined();
  });
});
