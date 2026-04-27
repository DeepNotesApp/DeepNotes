import { describe, expect, it } from "vitest";

import { getOpenApiDocument } from "./openapi.js";

describe("getOpenApiDocument", () => {
  it("includes /api/health", () => {
    const doc = getOpenApiDocument();
    expect(doc.paths?.["/api/health"]?.get).toBeDefined();
  });
});
