import { describe, expect, it } from "vitest";
import { computeArrowEndpoints, lineRectIntersection } from "./arrow-geometry";

describe("arrow-geometry", () => {
  describe("lineRectIntersection", () => {
    it("finds right edge when line goes right", () => {
      const result = lineRectIntersection(50, 50, 150, 50, {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });
      expect(result.x).toBe(100);
      expect(result.y).toBe(50);
    });

    it("finds top edge when line goes up", () => {
      const result = lineRectIntersection(50, 50, 50, -50, {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });
      expect(result.x).toBe(50);
      expect(result.y).toBe(0);
    });

    it("returns center when dx and dy are zero", () => {
      const result = lineRectIntersection(50, 50, 50, 50, {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });
      expect(result.x).toBe(50);
      expect(result.y).toBe(50);
    });
  });

  describe("computeArrowEndpoints", () => {
    it("uses center points when edge intersection is disabled", () => {
      const result = computeArrowEndpoints(
        { x: 0, y: 0 },
        { x: 200, y: 0 },
        100,
        100,
        100,
        100,
        false,
      );
      expect(result.x1).toBe(50);
      expect(result.y1).toBe(50);
      expect(result.x2).toBe(250);
      expect(result.y2).toBe(50);
    });

    it("finds edge points when line body is enabled", () => {
      const result = computeArrowEndpoints(
        { x: 0, y: 0 },
        { x: 200, y: 0 },
        100,
        100,
        100,
        100,
        true,
      );
      // Source right edge, target left edge
      expect(result.x1).toBe(100);
      expect(result.y1).toBe(50);
      expect(result.x2).toBe(200);
      expect(result.y2).toBe(50);
    });
  });
});
