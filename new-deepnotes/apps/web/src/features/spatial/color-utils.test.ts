import { describe, expect, it } from "vitest";
import { lightenColor, resolveNoteColorVariants } from "./color-utils";

describe("color-utils", () => {
  describe("lightenColor", () => {
    it("returns the same color at ratio 0", () => {
      expect(lightenColor("#000000", 0)).toBe("#000000");
      expect(lightenColor("#ff0000", 0)).toBe("#ff0000");
    });

    it("returns white at ratio 1", () => {
      expect(lightenColor("#000000", 1)).toBe("#ffffff");
      expect(lightenColor("#ff0000", 1)).toBe("#ffffff");
    });

    it("lightens a red color by 50%", () => {
      const result = lightenColor("#ff0000", 0.5);
      expect(result).toBe("#ff8080");
    });

    it("clamps ratio to [0, 1]", () => {
      expect(lightenColor("#000000", -0.5)).toBe("#000000");
      expect(lightenColor("#000000", 1.5)).toBe("#ffffff");
    });

    it("handles shorthand hex", () => {
      expect(lightenColor("#f00", 0.5)).toBe("#ff8080");
    });

    it("returns input unchanged for invalid hex", () => {
      expect(lightenColor("not-a-color", 0.5)).toBe("not-a-color");
    });
  });

  describe("resolveNoteColorVariants", () => {
    it("resolves known color names to variants", () => {
      const variants = resolveNoteColorVariants("red");
      expect(variants.base).toBe("#ef4444");
      expect(variants.light).toMatch(/^#/);
      expect(variants.highlight).toMatch(/^#/);
    });

    it("resolves raw hex values to variants", () => {
      const variants = resolveNoteColorVariants("#ff0000");
      expect(variants.base).toBe("#ff0000");
      expect(variants.light).toBe("#ff5959"); // lighten 0.35
      expect(variants.highlight).toBe("#ffa6a6"); // lighten 0.65
    });

    it("returns raw value for unknown input", () => {
      const variants = resolveNoteColorVariants("currentColor");
      expect(variants.base).toBe("currentColor"); // falls through to raw value
    });
  });
});
