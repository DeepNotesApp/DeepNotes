import { describe, expect, it } from "vitest";

import { createAppRouter } from "./router";

describe("router", () => {
  it("registers page spatial canvas route", () => {
    const router = createAppRouter();
    const page = router
      .getRoutes()
      .find((r) => r.name === "page");
    expect(page?.path).toBe("/pages/:pageId");
  });
});
