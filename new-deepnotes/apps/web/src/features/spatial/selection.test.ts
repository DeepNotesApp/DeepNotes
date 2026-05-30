import { describe, expect, it } from "vitest";

import { useSpatialSelection } from "./selection";

describe("useSpatialSelection", () => {
  it("selects a single note and sets active", () => {
    const s = useSpatialSelection();
    s.select("a", "note");
    expect(s.isSelected("a")).toBe(true);
    expect(s.activeId.value).toBe("a");
  });

  it("multi-select adds without clearing", () => {
    const s = useSpatialSelection();
    s.select("a", "note");
    s.select("b", "note", true);
    expect(s.isSelected("a")).toBe(true);
    expect(s.isSelected("b")).toBe(true);
    expect(s.activeId.value).toBe("b");
  });

  it("toggle adds then removes", () => {
    const s = useSpatialSelection();
    s.toggle("a", "note");
    expect(s.isSelected("a")).toBe(true);
    s.toggle("a", "note");
    expect(s.isSelected("a")).toBe(false);
    expect(s.activeId.value).toBeNull();
  });

  it("clear empties selection", () => {
    const s = useSpatialSelection();
    s.select("a", "note");
    s.select("b", "note", true);
    s.clear();
    expect(s.selectedIds.value.size).toBe(0);
    expect(s.activeId.value).toBeNull();
    expect(s.hasSelection.value).toBe(false);
  });

  it("selectAll selects every note id", () => {
    const s = useSpatialSelection();
    s.selectAll(["a", "b", "c"]);
    expect(s.isSelected("a")).toBe(true);
    expect(s.isSelected("b")).toBe(true);
    expect(s.isSelected("c")).toBe(true);
    expect(s.activeId.value).toBe("a");
  });

  it("tracks box selection coordinates", () => {
    const s = useSpatialSelection();
    s.startBoxSelect(100, 100);
    expect(s.boxSelecting.value).toBe(true);
    expect(s.boxRect.value).toEqual({ x: 100, y: 100, width: 0, height: 0 });

    s.updateBoxSelect(200, 150);
    expect(s.boxRect.value).toEqual({ x: 100, y: 100, width: 100, height: 50 });

    const result = s.endBoxSelect();
    expect(s.boxSelecting.value).toBe(false);
    expect(s.boxRect.value).toBeNull();
    expect(result.start).toEqual({ x: 100, y: 100 });
    expect(result.end).toEqual({ x: 200, y: 150 });
  });

  it("deselect removes activeId when removing last selected", () => {
    const s = useSpatialSelection();
    s.select("a", "note");
    s.deselect("a");
    expect(s.activeId.value).toBeNull();
  });

  it("deselect shifts activeId to another selected note", () => {
    const s = useSpatialSelection();
    s.select("a", "note");
    s.select("b", "note", true);
    s.deselect("b");
    expect(s.activeId.value).toBe("a");
  });

  it("selectedOfKind filters by kind", () => {
    const s = useSpatialSelection();
    s.select("n1", "note");
    s.select("a1", "arrow", true);
    expect(s.selectedOfKind("note")).toEqual(["n1"]);
    expect(s.selectedOfKind("arrow")).toEqual(["a1"]);
  });
});
