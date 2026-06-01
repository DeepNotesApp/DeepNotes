import { describe, expect, it } from "vitest";
import { rectsIntersect, getNoteEffectiveWorldPos, getNoteRect } from "./note-geometry";
import type { NoteModel } from "./note-model";

describe("note-geometry", () => {
  describe("rectsIntersect", () => {
    it("returns true for overlapping rectangles", () => {
      expect(rectsIntersect(0, 0, 100, 100, 50, 50, 100, 100)).toBe(true);
    });

    it("returns false for non-overlapping rectangles", () => {
      expect(rectsIntersect(0, 0, 100, 100, 200, 200, 100, 100)).toBe(false);
    });

    it("returns true for edge-touching rectangles", () => {
      expect(rectsIntersect(0, 0, 100, 100, 100, 0, 100, 100)).toBe(false);
    });

    it("returns true when one rect is fully inside another", () => {
      expect(rectsIntersect(0, 0, 100, 100, 25, 25, 50, 50)).toBe(true);
    });
  });

  describe("getNoteEffectiveWorldPos", () => {
    it("returns note position when note has no parent", () => {
      const noteList = [
        {
          id: "n1",
          model: {
            pos: { value: { x: 10, y: 20 } },
          } as unknown as NoteModel,
        },
      ];
      const parentOf = new Map<string, string>();
      expect(getNoteEffectiveWorldPos("n1", noteList, parentOf)).toEqual({ x: 10, y: 20 });
    });

    it("returns offset position when note is inside a container", () => {
      const noteList = [
        {
          id: "parent",
          model: {
            pos: { value: { x: 100, y: 200 } },
          } as unknown as NoteModel,
        },
        {
          id: "child",
          model: {
            pos: { value: { x: 10, y: 20 } },
          } as unknown as NoteModel,
        },
      ];
      const parentOf = new Map<string, string>([["child", "parent"]]);
      expect(getNoteEffectiveWorldPos("child", noteList, parentOf)).toEqual({
        x: 110,
        y: 200 + 20 + 48,
      });
    });

    it("returns null for missing note", () => {
      expect(getNoteEffectiveWorldPos("missing", [], new Map())).toBeNull();
    });
  });

  describe("getNoteRect", () => {
    it("returns rect with fixed width", () => {
      const noteList = [
        {
          id: "n1",
          model: {
            pos: { value: { x: 10, y: 20 } },
            width: { value: { expanded: "200" } },
          } as unknown as NoteModel,
        },
      ];
      expect(getNoteRect("n1", noteList, new Map())).toEqual({
        x: 10,
        y: 20,
        width: 200,
        height: 80,
      });
    });

    it("returns rect with Auto width as 160", () => {
      const noteList = [
        {
          id: "n1",
          model: {
            pos: { value: { x: 0, y: 0 } },
            width: { value: { expanded: "Auto" } },
          } as unknown as NoteModel,
        },
      ];
      expect(getNoteRect("n1", noteList, new Map())).toEqual({
        x: 0,
        y: 0,
        width: 160,
        height: 80,
      });
    });

    it("returns null for missing note", () => {
      expect(getNoteRect("missing", [], new Map())).toBeNull();
    });
  });
});
