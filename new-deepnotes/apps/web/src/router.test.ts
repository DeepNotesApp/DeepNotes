import { describe, expect, it } from "vitest";

import router from "./router";

describe("router", () => {
  it("registers spatial world stub route", () => {
    const spatial = router
      .getRoutes()
      .find((r) => r.name === "spatial-world-stub");
    expect(spatial?.path).toBe("/spatial");
  });
});
