import { describe, expect, it } from "vitest";

import { shouldIgnoreSpaceForViewportPan } from "./spatial-keyboard";

describe("spatial-keyboard", () => {
  it("allows Space pan when target is generic div", () => {
    const el = document.createElement("div");
    expect(shouldIgnoreSpaceForViewportPan(el)).toBe(false);
  });

  it("ignores Space pan for contenteditable", () => {
    const el = document.createElement("div");
    el.contentEditable = "true";
    expect(shouldIgnoreSpaceForViewportPan(el)).toBe(true);
  });

  it("ignores when focus is inside nested contenteditable", () => {
    const root = document.createElement("div");
    root.contentEditable = "true";
    const child = document.createElement("span");
    root.appendChild(child);
    expect(shouldIgnoreSpaceForViewportPan(child)).toBe(true);
  });

  it("ignores inputs and textareas", () => {
    expect(shouldIgnoreSpaceForViewportPan(document.createElement("input"))).toBe(
      true,
    );
    expect(shouldIgnoreSpaceForViewportPan(document.createElement("textarea"))).toBe(
      true,
    );
  });
});
