import { describe, expect, it } from "vitest";
import {
  rectsIntersect,
  getNoteEffectiveWorldPos,
  getNoteRect,
  getIslandRoot,
  getIslandNoteIds,
  getIslandRect,
  getRelativeRect,
} from "./note-geometry";
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

    it("returns offset position when note is inside a container (default 48)", () => {
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

    it("uses custom originOffset when provided", () => {
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
      const originOffsets = new Map([["parent", 72]]);
      expect(getNoteEffectiveWorldPos("child", noteList, parentOf, originOffsets)).toEqual({
        x: 110,
        y: 200 + 20 + 72,
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

    it("reads actual height from heights map when provided", () => {
      const noteList = [
        {
          id: "n1",
          model: {
            pos: { value: { x: 0, y: 0 } },
            width: { value: { expanded: "Auto" } },
          } as unknown as NoteModel,
        },
      ];
      const heights = new Map([["n1", 120]]);
      expect(getNoteRect("n1", noteList, new Map(), heights)).toEqual({
        x: 0,
        y: 0,
        width: 160,
        height: 120,
      });
    });

    it("falls back to 80 when heights map is missing the note", () => {
      const noteList = [
        {
          id: "n1",
          model: {
            pos: { value: { x: 0, y: 0 } },
            width: { value: { expanded: "Auto" } },
          } as unknown as NoteModel,
        },
      ];
      expect(getNoteRect("n1", noteList, new Map(), new Map())).toEqual({
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

  describe("getIslandRoot", () => {
    it("returns note itself when it has no parent", () => {
      const noteList = [
        {
          id: "n1",
          model: {
            pos: { value: { x: 0, y: 0 } },
            container: { enabled: { value: false }, spatial: { value: false }, overflow: { value: false } },
          } as unknown as NoteModel,
        },
      ];
      expect(getIslandRoot("n1", noteList, new Map())).toBe("n1");
    });

    it("returns parent when parent is non-spatial overflow container", () => {
      const noteList = [
        {
          id: "parent",
          model: {
            pos: { value: { x: 0, y: 0 } },
            container: { enabled: { value: true }, spatial: { value: false }, overflow: { value: true } },
          } as unknown as NoteModel,
        },
        {
          id: "child",
          model: {
            pos: { value: { x: 10, y: 10 } },
            container: { enabled: { value: false }, spatial: { value: false }, overflow: { value: false } },
          } as unknown as NoteModel,
        },
      ];
      const parentOf = new Map([["child", "parent"]]);
      expect(getIslandRoot("child", noteList, parentOf)).toBe("parent");
    });

    it("returns root note when parent chain is all spatial", () => {
      const noteList = [
        {
          id: "root",
          model: {
            pos: { value: { x: 0, y: 0 } },
            container: { enabled: { value: true }, spatial: { value: true }, overflow: { value: false } },
          } as unknown as NoteModel,
        },
        {
          id: "child",
          model: {
            pos: { value: { x: 10, y: 10 } },
            container: { enabled: { value: false }, spatial: { value: false }, overflow: { value: false } },
          } as unknown as NoteModel,
        },
      ];
      const parentOf = new Map([["child", "root"]]);
      expect(getIslandRoot("child", noteList, parentOf)).toBe("root");
    });
  });

  describe("getIslandNoteIds", () => {
    it("includes root and its children for spatial container", () => {
      const noteList = [
        {
          id: "root",
          model: {
            pos: { value: { x: 0, y: 0 } },
            container: { enabled: { value: true }, spatial: { value: true }, overflow: { value: false } },
          } as unknown as NoteModel,
        },
        {
          id: "child",
          model: {
            pos: { value: { x: 10, y: 10 } },
            container: { enabled: { value: false }, spatial: { value: false }, overflow: { value: false } },
          } as unknown as NoteModel,
        },
      ];
      const parentOf = new Map([["child", "root"]]);
      const ids = getIslandNoteIds("root", noteList, parentOf);
      expect(ids).toEqual(new Set(["root", "child"]));
    });

    it("excludes children of non-spatial overflow container", () => {
      const noteList = [
        {
          id: "root",
          model: {
            pos: { value: { x: 0, y: 0 } },
            container: { enabled: { value: true }, spatial: { value: true }, overflow: { value: false } },
          } as unknown as NoteModel,
        },
        {
          id: "overflow",
          model: {
            pos: { value: { x: 10, y: 10 } },
            container: { enabled: { value: true }, spatial: { value: false }, overflow: { value: true } },
          } as unknown as NoteModel,
        },
        {
          id: "deep",
          model: {
            pos: { value: { x: 5, y: 5 } },
            container: { enabled: { value: false }, spatial: { value: false }, overflow: { value: false } },
          } as unknown as NoteModel,
        },
      ];
      const parentOf = new Map([
        ["overflow", "root"],
        ["deep", "overflow"],
      ]);
      const ids = getIslandNoteIds("root", noteList, parentOf);
      expect(ids).toEqual(new Set(["root", "overflow"]));
    });
  });

  describe("getIslandRect", () => {
    it("returns bounding rect of root and its descendants", () => {
      const noteList = [
        {
          id: "root",
          model: {
            pos: { value: { x: 0, y: 0 } },
            width: { value: { expanded: "100" } },
            container: { enabled: { value: true }, spatial: { value: true }, overflow: { value: false } },
          } as unknown as NoteModel,
        },
        {
          id: "child",
          model: {
            pos: { value: { x: 50, y: 30 } },
            width: { value: { expanded: "100" } },
            container: { enabled: { value: false }, spatial: { value: false }, overflow: { value: false } },
          } as unknown as NoteModel,
        },
      ];
      const parentOf = new Map([["child", "root"]]);
      const rect = getIslandRect("root", noteList, parentOf);
      // root: (0, 0) -> (100, 80)
      // child world: (0+50, 0+48+30) = (50, 78) -> (150, 158)
      expect(rect).toEqual({ x: 0, y: 0, width: 150, height: 158 });
    });

    it("returns single note rect when note has no children", () => {
      const noteList = [
        {
          id: "n1",
          model: {
            pos: { value: { x: 10, y: 20 } },
            width: { value: { expanded: "100" } },
            container: { enabled: { value: false }, spatial: { value: false }, overflow: { value: false } },
          } as unknown as NoteModel,
        },
      ];
      const parentOf = new Map();
      const rect = getIslandRect("n1", noteList, parentOf);
      expect(rect).toEqual({ x: 10, y: 20, width: 100, height: 80 });
    });
  });

  describe("getRelativeRect", () => {
    it("returns rect offset by island root position (accounting for originOffset)", () => {
      const noteList = [
        {
          id: "root",
          model: {
            pos: { value: { x: 100, y: 200 } },
            width: { value: { expanded: "100" } },
            container: { enabled: { value: true }, spatial: { value: true }, overflow: { value: false } },
          } as unknown as NoteModel,
        },
        {
          id: "child",
          model: {
            pos: { value: { x: 10, y: 20 } },
            width: { value: { expanded: "100" } },
            container: { enabled: { value: false }, spatial: { value: false }, overflow: { value: false } },
          } as unknown as NoteModel,
        },
      ];
      const parentOf = new Map([["child", "root"]]);
      const rect = getRelativeRect("child", noteList, parentOf);
      // child world pos = (100+10, 200+48+20) = (110, 268)
      // root world pos = (100, 200)
      // relative = (10, 68)
      expect(rect).toEqual({ x: 10, y: 68, width: 100, height: 80 });
    });
  });
});
