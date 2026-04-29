import { describe, expect, it } from "vitest";

import { formatNotificationPayload } from "./decrypt-notification-body";

describe("formatNotificationPayload", () => {
  it("formats objects as JSON", () => {
    expect(formatNotificationPayload({ hello: "world" })).toContain('"hello"');
  });

  it("returns strings as-is", () => {
    expect(formatNotificationPayload("plain")).toBe("plain");
  });
});
