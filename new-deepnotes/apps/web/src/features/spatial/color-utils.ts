/**
 * Hex color manipulation utilities to match legacy color variants.
 * Legacy used `lightenByRatio` from `@stdlib/color`.
 */

export interface ColorVariants {
  base: string;
  light: string;
  highlight: string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace("#", "");
  if (clean.length !== 6 && clean.length !== 3) return null;
  const full = clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return null;
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function lightenRgb(
  rgb: { r: number; g: number; b: number },
  ratio: number,
): { r: number; g: number; b: number } {
  // Blend toward white by ratio (0 = no change, 1 = white)
  return {
    r: rgb.r + (255 - rgb.r) * ratio,
    g: rgb.g + (255 - rgb.g) * ratio,
    b: rgb.b + (255 - rgb.b) * ratio,
  };
}

export function lightenColor(hex: string, ratio: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const lightened = lightenRgb(rgb, Math.max(0, Math.min(1, ratio)));
  return rgbToHex(lightened.r, lightened.g, lightened.b);
}

export function resolveNoteColorVariants(colorValue: string | undefined): ColorVariants {
  const colorMap: Record<string, string> = {
    grey: "#9ca3af",
    red: "#ef4444",
    green: "#22c55e",
    blue: "#3b82f6",
    yellow: "#eab308",
    purple: "#a855f7",
    orange: "#f97316",
    pink: "#ec4899",
    cyan: "#06b6d4",
    black: "#171717",
    white: "#f5f5f5",
  };
  const base = (colorValue ? colorMap[colorValue] : undefined) ?? colorValue ?? "#9ca3af";
  return {
    base,
    light: lightenColor(base, 0.35),
    highlight: lightenColor(base, 0.65),
  };
}
